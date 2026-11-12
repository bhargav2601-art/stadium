import { can } from "@/domain/permissions";
import { cleanText } from "@/domain/text";
import { kolkataParts } from "@/domain/time";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { AppError, ForbiddenError } from "@/server/errors";
import { requirePlayableMembership } from "@/server/membership";
import { notifyUsers } from "@/server/notifications";
import { getSettings } from "@/server/settings";
import type { CourtStatus, FacilityKind, Role } from "../../generated/prisma/client";

export async function getFacilitiesSnapshot() {
  const [facilities, settings, activeBasketball, basketballInterestCount, upcomingYoga] = await Promise.all([
    prisma.facility.findMany({
      include: {
        courts: { orderBy: { code: "asc" } },
        schedules: { orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }] },
        queue: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { kind: "asc" },
    }),
    getSettings(),
    prisma.basketballSession.findFirst({
      where: { published: true, endedAt: null },
      orderBy: { startsAt: "asc" },
    }),
    prisma.basketballInterest.count(),
    prisma.yogaSession.findMany({
      where: { cancelled: false, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: {
        registrations: { where: { cancelledAt: null }, select: { userId: true } },
      },
      take: 12,
    }),
  ]);

  return {
    facilities,
    staleMinutes: Number(settings["facility.stale_minutes"]),
    hoursNote: settings["stadium.hours_note"],
    activeBasketball,
    basketballInterestCount,
    upcomingYoga,
  };
}

export async function updateCourtStatus(
  actorId: string,
  actorRole: Role,
  courtId: string,
  input: { status: CourtStatus; note?: string | null },
) {
  if (!can(actorRole, "courts.update")) {
    throw new ForbiddenError("Only authorized stadium staff and administrators can update court statuses.");
  }

  return prisma.$transaction(async (tx) => {
    const court = await tx.court.findUnique({
      where: { id: courtId },
      include: { facility: true },
    });
    if (!court) throw new AppError("Court not found.", 404);

    if (actorRole === "STAFF") {
      const assignmentCount = await tx.staffAssignment.count({ where: { userId: actorId } });
      if (assignmentCount > 0) {
        const assigned = await tx.staffAssignment.findUnique({
          where: { userId_facilityId: { userId: actorId, facilityId: court.facilityId } },
        });
        if (!assigned) {
          throw new ForbiddenError("You are not assigned to manage courts for this facility.");
        }
      }
    }

    if (court.facility.kind === "BADMINTON" && input.status !== "BASKETBALL") {
      const liveBasketball = await tx.basketballSession.findFirst({
        where: { published: true, endedAt: null },
      });
      if (liveBasketball) {
        throw new AppError("End the active basketball shared-floor session before reopening badminton courts.");
      }
    }

    const note = input.note ? cleanText(input.note, 200) : null;
    const updated = await tx.court.update({
      where: { id: courtId },
      data: {
        status: input.status,
        statusNote: note,
        updatedById: actorId,
        statusUpdatedAt: new Date(),
      },
    });

    await tx.courtStatusHistory.create({
      data: {
        courtId,
        status: input.status,
        note,
        updatedById: actorId,
      },
    });

    return updated;
  });
}

export async function joinCourtQueue(userId: string, facilityKind: FacilityKind, note?: string | null) {
  await requirePlayableMembership(userId);
  const facility = await prisma.facility.findUnique({ where: { kind: facilityKind } });
  if (!facility || !facility.active) throw new AppError("Facility not available.", 404);
  if (facility.closed) throw new AppError(facility.closedReason || "This facility is currently closed.");

  if (facilityKind === "BADMINTON") {
    const liveBasketball = await prisma.basketballSession.findFirst({
      where: { published: true, endedAt: null },
    });
    if (liveBasketball) {
      throw new AppError("Badminton courts are temporarily disabled for a scheduled basketball session.");
    }
  }

  return prisma.courtQueueEntry.upsert({
    where: { facilityId_userId: { facilityId: facility.id, userId } },
    update: { note: note ? cleanText(note, 140) : null },
    create: {
      facilityId: facility.id,
      userId,
      note: note ? cleanText(note, 140) : null,
    },
  });
}

export async function leaveCourtQueue(userId: string, facilityKind: FacilityKind) {
  const facility = await prisma.facility.findUnique({ where: { kind: facilityKind } });
  if (!facility) throw new AppError("Facility not found.", 404);
  await prisma.courtQueueEntry.deleteMany({ where: { facilityId: facility.id, userId } });
}

export async function reportFacilityIssue(
  userId: string,
  input: { facilityKind: FacilityKind; courtId?: string | null; description: string },
) {
  const facility = await prisma.facility.findUnique({ where: { kind: input.facilityKind } });
  if (!facility) throw new AppError("Facility not found.", 404);
  const description = cleanText(input.description, 500);
  if (description.length < 5) throw new AppError("Describe the issue in at least 5 characters.");

  const report = await prisma.facilityReport.create({
    data: {
      facilityId: facility.id,
      courtId: input.courtId || null,
      reportedById: userId,
      description,
      status: "OPEN",
    },
  });
  return report;
}

export function assertMorningYogaWindow(startsAt: Date, endsAt: Date) {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new AppError("Provide valid start and end timestamps.");
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new AppError("Yoga session end time must be after its start time.");
  }
  const startParts = kolkataParts(startsAt);
  const endParts = kolkataParts(endsAt);
  if (startParts.date !== endParts.date) {
    throw new AppError("Yoga sessions must start and end on the same morning.");
  }
  if (startParts.minutes < 5 * 60 || endParts.minutes > 12 * 60) {
    throw new AppError("Yoga is morning-only (05:00 to 12:00 IST).");
  }
}

export async function createYogaSession(
  actorId: string,
  actorRole: Role,
  input: { title: string; startsAt: Date; endsAt: Date; capacity?: number | null; notes?: string | null },
) {
  if (!can(actorRole, "yoga.manage")) {
    throw new ForbiddenError("Only administrators can schedule yoga sessions.");
  }
  assertMorningYogaWindow(input.startsAt, input.endsAt);
  const title = cleanText(input.title, 120);
  if (title.length < 3) throw new AppError("Enter a session title.");

  const session = await prisma.yogaSession.create({
    data: {
      title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity ?? null,
      notes: input.notes ? cleanText(input.notes, 400) : null,
      createdById: actorId,
    },
  });
  await audit(actorId, "yoga.create", "YogaSession", session.id, { title });
  return session;
}

export async function registerForYoga(userId: string, sessionId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM yoga_sessions WHERE id = ${sessionId} FOR UPDATE`;
    await requirePlayableMembership(userId, tx);

    const session = await tx.yogaSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError("Yoga session not found.", 404);
    if (session.cancelled) throw new AppError("This yoga session was cancelled.");
    if (session.endsAt.getTime() <= Date.now()) {
      throw new AppError("This yoga session has already ended.");
    }

    const existing = await tx.yogaRegistration.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing && !existing.cancelledAt) {
      throw new AppError("You are already registered for this yoga session.");
    }

    if (session.capacity !== null) {
      const currentCount = await tx.yogaRegistration.count({
        where: { sessionId, cancelledAt: null },
      });
      if (currentCount >= session.capacity) {
        throw new AppError("This morning yoga session is at full capacity.");
      }
    }

    return tx.yogaRegistration.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: { cancelledAt: null },
      create: { sessionId, userId },
    });
  });
}

export async function cancelYogaRegistration(userId: string, sessionId: string) {
  return prisma.yogaRegistration.updateMany({
    where: { sessionId, userId, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
}

export async function setBasketballInterest(userId: string, interested: boolean, note?: string | null) {
  await requirePlayableMembership(userId);
  if (!interested) {
    await prisma.basketballInterest.deleteMany({ where: { userId } });
    return { interested: false, totalInterested: await prisma.basketballInterest.count() };
  }

  await prisma.basketballInterest.upsert({
    where: { userId },
    update: { note: note ? cleanText(note, 200) : null },
    create: { userId, note: note ? cleanText(note, 200) : null },
  });
  return { interested: true, totalInterested: await prisma.basketballInterest.count() };
}

export async function scheduleBasketballSession(
  actorId: string,
  actorRole: Role,
  input: { startsAt: Date; endsAt: Date; notes?: string | null; publish: boolean },
) {
  if (!can(actorRole, "basketball.schedule")) {
    throw new ForbiddenError("Only management can schedule basketball shared-floor mode.");
  }
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new AppError("Session end time must be after start time.");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.basketballSession.create({
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        notes: input.notes ? cleanText(input.notes, 400) : null,
        published: input.publish,
        createdById: actorId,
      },
    });

    if (input.publish) {
      await applyBasketballCourtConversion(tx, actorId, session.id);
    }

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: input.publish ? "basketball.publish" : "basketball.schedule",
        entity: "BasketballSession",
        entityId: session.id,
        metadata: { publish: input.publish, startsAt: input.startsAt.toISOString(), endsAt: input.endsAt.toISOString() },
      },
    });

    return session;
  });
}

async function applyBasketballCourtConversion(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], actorId: string, sessionId: string) {
  const badminton = await tx.facility.findUnique({
    where: { kind: "BADMINTON" },
    include: { courts: true },
  });
  if (!badminton) return;

  const note = "Shared floor converted for scheduled basketball session.";
  for (const court of badminton.courts) {
    await tx.court.update({
      where: { id: court.id },
      data: {
        status: "BASKETBALL",
        statusNote: note,
        updatedById: actorId,
        statusUpdatedAt: new Date(),
      },
    });
    await tx.courtStatusHistory.create({
      data: {
        courtId: court.id,
        status: "BASKETBALL",
        note: `${note} (Session ${sessionId})`,
        updatedById: actorId,
      },
    });
  }

  const activeMembers = await tx.membership.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    select: { userId: true },
  });
  await notifyUsers(
    activeMembers.map((m) => m.userId),
    {
      type: "BASKETBALL_SCHEDULED",
      title: "Basketball shared-floor mode active",
      body: "Management enabled basketball mode on the main floor. All four badminton courts are paused for this session.",
      href: "/portal/facilities",
    },
    tx,
  );
}

export async function toggleBasketballSessionState(
  actorId: string,
  actorRole: Role,
  sessionId: string,
  action: "PUBLISH" | "END",
) {
  if (!can(actorRole, "basketball.schedule")) {
    throw new ForbiddenError("Only management can control basketball mode.");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.basketballSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError("Basketball session not found.", 404);

    if (action === "PUBLISH") {
      if (session.endedAt) throw new AppError("Ended sessions cannot be republished.");
      const updated = await tx.basketballSession.update({
        where: { id: sessionId },
        data: { published: true },
      });
      await applyBasketballCourtConversion(tx, actorId, sessionId);
      await tx.adminAuditLog.create({
        data: { actorId, action: "basketball.publish", entity: "BasketballSession", entityId: sessionId, metadata: {} },
      });
      return updated;
    }

    const updated = await tx.basketballSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    const otherLive = await tx.basketballSession.findFirst({
      where: { id: { not: sessionId }, published: true, endedAt: null },
    });
    if (!otherLive) {
      const badminton = await tx.facility.findUnique({
        where: { kind: "BADMINTON" },
        include: { courts: true },
      });
      if (badminton) {
        for (const court of badminton.courts) {
          if (court.status === "BASKETBALL") {
            await tx.court.update({
              where: { id: court.id },
              data: {
                status: "AVAILABLE",
                statusNote: "Restored after basketball session.",
                updatedById: actorId,
                statusUpdatedAt: new Date(),
              },
            });
            await tx.courtStatusHistory.create({
              data: {
                courtId: court.id,
                status: "AVAILABLE",
                note: "Restored after basketball session.",
                updatedById: actorId,
              },
            });
          }
        }
      }
    }

    await tx.adminAuditLog.create({
      data: { actorId, action: "basketball.end", entity: "BasketballSession", entityId: sessionId, metadata: {} },
    });
    return updated;
  });
}

export async function recordCheckIn(
  staffId: string,
  staffRole: Role,
  input: { memberId: string; facilityKind: FacilityKind; courtId?: string | null; action: "IN" | "OUT" },
) {
  if (!can(staffRole, "checkin.verify")) {
    throw new ForbiddenError("Only staff and administrators can verify facility check-ins.");
  }

  const facility = await prisma.facility.findUnique({ where: { kind: input.facilityKind } });
  if (!facility) throw new AppError("Facility not found.", 404);

  if (input.action === "OUT") {
    const openCheckIn = await prisma.facilityCheckIn.findFirst({
      where: { userId: input.memberId, facilityId: facility.id, checkedOutAt: null },
      orderBy: { checkedInAt: "desc" },
    });
    if (!openCheckIn) throw new AppError("No active check-in found for this member.");
    return prisma.facilityCheckIn.update({
      where: { id: openCheckIn.id },
      data: { checkedOutAt: new Date() },
    });
  }

  if (facility.closed) {
    throw new AppError(facility.closedReason || "This facility is currently closed.");
  }

  await requirePlayableMembership(input.memberId);

  return prisma.facilityCheckIn.create({
    data: {
      userId: input.memberId,
      facilityId: facility.id,
      courtId: input.courtId || null,
      verifiedById: staffId,
    },
  });
}
