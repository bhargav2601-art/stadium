import { assertMaxPlayers, assertTransition, canStartGame, statusAfterRosterChange } from "@/domain/game-state";
import { slotsOverlap } from "@/domain/overlap";
import { can } from "@/domain/permissions";
import { cleanText } from "@/domain/text";
import { addDays, dateFromIso, isoDate, isSlotInPast, kolkataParts, scheduledStart } from "@/domain/time";
import { prisma } from "@/lib/db";
import type { Tx } from "@/lib/db";
import { AppError, ForbiddenError } from "@/server/errors";
import { requirePlayableMembership, syncMembership } from "@/server/membership";
import { notifyUsers } from "@/server/notifications";
import { getSettings } from "@/server/settings";
import type { GameType, JoinMode, PlayStyle, Role, SessionPeriod, SkillLevel, Sport } from "../../generated/prisma/client";

const ACTIVE_GAME_STATUSES = ["CREATED", "OPEN", "FULL", "IN_PROGRESS", "WAITING_FOR_REPLACEMENT"] as const;

export function validatePeriodClockTime(period: SessionPeriod, startTime: string | null) {
  if (!startTime) return;
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) throw new AppError("Use HH:mm format for start time (for example 06:30 or 18:30).");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new AppError("Enter a valid clock time.");
  const total = hour * 60 + minute;
  if (period === "MORNING" && (total < 5 * 60 || total > 11 * 60 + 30)) {
    throw new AppError("Morning games must start between 05:00 and 11:30.");
  }
  if (period === "EVENING" && (total < 15 * 60 || total > 21 * 60 + 30)) {
    throw new AppError("Evening games must start between 15:00 and 21:30.");
  }
}

async function assertNoSlotOverlap(
  tx: Tx,
  userId: string,
  candidate: { date: string; period: SessionPeriod; startTime: string | null; durationMin: number },
  excludeGameId?: string,
) {
  const existing = await tx.gameParticipant.findMany({
    where: {
      userId,
      status: "CONFIRMED",
      game: {
        date: dateFromIso(candidate.date),
        status: { in: [...ACTIVE_GAME_STATUSES] },
        ...(excludeGameId ? { id: { not: excludeGameId } } : {}),
      },
    },
    include: { game: true },
  });

  for (const row of existing) {
    if (
      slotsOverlap(candidate, {
        date: isoDate(row.game.date),
        period: row.game.period,
        startTime: row.game.startTime,
        durationMin: candidate.durationMin,
      })
    ) {
      throw new AppError(
        `You already have a confirmed ${row.game.sport.toLowerCase().replace("_", " ")} game that overlaps this time slot.`,
      );
    }
  }
}

async function assertNoBasketballFloorConflict(
  tx: Tx,
  sport: Sport,
  date: string,
  period: SessionPeriod,
  startTime: string | null,
  durationMin: number,
) {
  if (sport !== "BADMINTON") return;
  const start = scheduledStart(date, startTime, period);
  const end = startTime
    ? new Date(start.getTime() + durationMin * 60_000)
    : scheduledStart(date, period === "MORNING" ? "10:00" : "21:00", period);

  const conflict = await tx.basketballSession.findFirst({
    where: {
      published: true,
      endedAt: null,
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
  });
  if (conflict) {
    throw new AppError(
      "Basketball shared-floor mode is scheduled during this slot, so all four badminton courts are unavailable.",
    );
  }
}

async function offerNextWaitlistPlayer(tx: Tx, gameId: string, offerMinutes: number, now = new Date()) {
  const activeOffer = await tx.gameWaitlist.findFirst({
    where: { gameId, status: "OFFERED" },
  });
  if (activeOffer) return null;

  const next = await tx.gameWaitlist.findFirst({
    where: { gameId, status: "WAITING" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  if (!next) return null;

  const expiresAt = new Date(now.getTime() + offerMinutes * 60_000);
  const updated = await tx.gameWaitlist.update({
    where: { id: next.id },
    data: { status: "OFFERED", offeredAt: now, offerExpiresAt: expiresAt },
  });

  await notifyUsers(
    [next.userId],
    {
      type: "WAITLIST_OFFER",
      title: "A game slot opened for you",
      body: `You have ${offerMinutes} minutes to accept your waiting-list spot before it passes to the next player.`,
      href: `/portal/games/${gameId}`,
    },
    tx,
  );
  return updated;
}

export async function createGame(
  userId: string,
  input: {
    sport: Sport;
    gameType: GameType;
    date: string;
    period: SessionPeriod;
    startTime?: string | null;
    skillLevel?: SkillLevel | null;
    playStyle?: PlayStyle | null;
    maxPlayers: number;
    joinMode: JoinMode;
    description?: string | null;
  },
) {
  const startTime = input.startTime ? input.startTime.trim() : null;
  validatePeriodClockTime(input.period, startTime);
  assertMaxPlayers(input.gameType, input.maxPlayers);
  if (isSlotInPast({ date: input.date, period: input.period, startTime })) {
    throw new AppError("You cannot schedule a game in the past.");
  }

  return prisma.$transaction(async (tx) => {
    await requirePlayableMembership(userId, tx);
    const settings = await getSettings(tx);
    const durationMin = Number(settings["game.duration_minutes"]);
    const graceMinutes = Number(settings["game.grace_minutes"]);

    await assertNoBasketballFloorConflict(tx, input.sport, input.date, input.period, startTime, durationMin);
    await assertNoSlotOverlap(tx, userId, {
      date: input.date,
      period: input.period,
      startTime,
      durationMin,
    });

    const game = await tx.game.create({
      data: {
        sport: input.sport,
        gameType: input.gameType,
        date: dateFromIso(input.date),
        period: input.period,
        startTime,
        skillLevel: input.skillLevel ?? null,
        playStyle: input.playStyle ?? null,
        maxPlayers: input.maxPlayers,
        joinMode: input.joinMode,
        status: "OPEN",
        description: input.description ? cleanText(input.description, 400) : null,
        organizerId: userId,
        graceMinutes,
        participants: {
          create: {
            userId,
            status: "CONFIRMED",
          },
        },
      },
    });
    return game;
  });
}

export async function joinGame(userId: string, gameId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    await requirePlayableMembership(userId, tx);
    const settings = await getSettings(tx);
    const durationMin = Number(settings["game.duration_minutes"]);

    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);

    if (game.status !== "OPEN" && game.status !== "WAITING_FOR_REPLACEMENT") {
      if (game.status === "FULL") {
        throw new AppError("This game is currently full. Join the waiting list instead.");
      }
      throw new AppError("This game is no longer accepting players.");
    }

    const existing = game.participants.find((p) => p.userId === userId);
    if (existing?.status === "CONFIRMED") {
      throw new AppError("You are already confirmed in this game.");
    }
    if (existing?.status === "REQUESTED") {
      throw new AppError("Your join request is already awaiting organizer approval.");
    }

    await assertNoSlotOverlap(
      tx,
      userId,
      {
        date: isoDate(game.date),
        period: game.period,
        startTime: game.startTime,
        durationMin,
      },
      game.id,
    );

    const confirmed = game.participants.filter((p) => p.status === "CONFIRMED");

    if (game.joinMode === "APPROVAL" && game.status !== "WAITING_FOR_REPLACEMENT") {
      const participant = await tx.gameParticipant.upsert({
        where: { gameId_userId: { gameId, userId } },
        update: { status: "REQUESTED" },
        create: { gameId, userId, status: "REQUESTED" },
      });

      await notifyUsers(
        [game.organizerId],
        {
          type: "GAME_JOIN_REQUEST",
          title: "New join request",
          body: "A stadium member requested to join your game.",
          href: `/portal/games/${gameId}`,
        },
        tx,
      );
      return { outcome: "REQUESTED" as const, participant, gameStatus: game.status };
    }

    if (confirmed.length >= game.maxPlayers) {
      throw new AppError("This game just filled up. You can join the waiting list.");
    }

    const participant = await tx.gameParticipant.upsert({
      where: { gameId_userId: { gameId, userId } },
      update: { status: "CONFIRMED" },
      create: { gameId, userId, status: "CONFIRMED" },
    });

    const newCount = confirmed.length + 1;
    const nextStatus = statusAfterRosterChange({
      count: newCount,
      max: game.maxPlayers,
      current: game.status,
      started: Boolean(game.startedAt),
      replacementOpen: game.status === "WAITING_FOR_REPLACEMENT",
    });

    await tx.game.update({
      where: { id: gameId },
      data: { status: nextStatus },
    });

    await notifyUsers(
      [game.organizerId],
      {
        type: "PLAYER_JOINED",
        title: "Player joined your game",
        body: `Roster is now ${newCount}/${game.maxPlayers} confirmed players.`,
        href: `/portal/games/${gameId}`,
      },
      tx,
    );

    if (nextStatus === "FULL") {
      await notifyUsers(
        [...confirmed.map((p) => p.userId), userId],
        {
          type: "GAME_FULL",
          title: "Game roster is full",
          body: "All slots are filled. Remember that physical badminton courts are first-come-first-served.",
          href: `/portal/games/${gameId}`,
        },
        tx,
      );
    }

    return { outcome: "CONFIRMED" as const, participant, gameStatus: nextStatus };
  });
}

export async function reviewJoinRequest(
  actorId: string,
  actorRole: Role,
  gameId: string,
  participantId: string,
  decision: "APPROVE" | "DECLINE",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    const settings = await getSettings(tx);
    const durationMin = Number(settings["game.duration_minutes"]);

    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);
    if (game.organizerId !== actorId && !can(actorRole, "games.moderate")) {
      throw new ForbiddenError("Only the game organizer or an administrator can review requests.");
    }

    const target = game.participants.find((p) => p.id === participantId);
    if (!target || target.status !== "REQUESTED") {
      throw new AppError("Join request is no longer pending.", 404);
    }

    if (decision === "DECLINE") {
      await tx.gameParticipant.update({
        where: { id: target.id },
        data: { status: "DECLINED" },
      });
      await notifyUsers(
        [target.userId],
        {
          type: "JOIN_REQUEST_DECLINED",
          title: "Join request declined",
          body: "The organizer declined your request for this game.",
          href: `/portal/games/${gameId}`,
        },
        tx,
      );
      return { status: game.status, participantStatus: "DECLINED" as const };
    }

    const confirmedCount = game.participants.filter((p) => p.status === "CONFIRMED").length;
    if (confirmedCount >= game.maxPlayers) {
      throw new AppError("This game is already at maximum player capacity.");
    }

    await requirePlayableMembership(target.userId, tx);
    await assertNoSlotOverlap(
      tx,
      target.userId,
      {
        date: isoDate(game.date),
        period: game.period,
        startTime: game.startTime,
        durationMin,
      },
      game.id,
    );

    await tx.gameParticipant.update({
      where: { id: target.id },
      data: { status: "CONFIRMED" },
    });

    const nextStatus = statusAfterRosterChange({
      count: confirmedCount + 1,
      max: game.maxPlayers,
      current: game.status,
      started: Boolean(game.startedAt),
    });

    await tx.game.update({
      where: { id: gameId },
      data: { status: nextStatus },
    });

    await notifyUsers(
      [target.userId],
      {
        type: "JOIN_REQUEST_APPROVED",
        title: "Join request approved",
        body: "You are confirmed in the game roster.",
        href: `/portal/games/${gameId}`,
      },
      tx,
    );

    return { status: nextStatus, participantStatus: "CONFIRMED" as const };
  });
}

export async function leaveGame(userId: string, gameId: string, needsReplacement = false) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    const settings = await getSettings(tx);
    const offerMinutes = Number(settings["game.offer_minutes"]);

    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);
    if (game.status === "COMPLETED" || game.status === "CANCELLED" || game.status === "INCOMPLETE") {
      throw new AppError("This game has already ended.");
    }
    if (game.organizerId === userId) {
      throw new AppError("As the organizer, cancel the game instead of leaving silently.");
    }

    const participant = game.participants.find((p) => p.userId === userId);
    if (!participant || (participant.status !== "CONFIRMED" && participant.status !== "REQUESTED")) {
      throw new AppError("You are not currently active in this game.");
    }

    const wasConfirmed = participant.status === "CONFIRMED";
    await tx.gameParticipant.update({
      where: { id: participant.id },
      data: { status: needsReplacement && wasConfirmed ? "REPLACED" : "CANCELLED" },
    });

    if (!wasConfirmed) {
      return { gameStatus: game.status, offeredWaitlistUserId: null };
    }

    const remainingConfirmed = game.participants.filter(
      (p) => p.userId !== userId && p.status === "CONFIRMED",
    ).length;

    const nextStatus = statusAfterRosterChange({
      count: remainingConfirmed,
      max: game.maxPlayers,
      current: game.status,
      started: Boolean(game.startedAt),
      replacementOpen: needsReplacement || game.status === "WAITING_FOR_REPLACEMENT",
    });

    await tx.game.update({
      where: { id: gameId },
      data: { status: nextStatus },
    });

    await notifyUsers(
      [game.organizerId],
      {
        type: needsReplacement ? "REPLACEMENT_NEEDED" : "PLAYER_CANCELLED",
        title: needsReplacement ? "Replacement needed for game" : "Player withdrew from game",
        body: `Roster is now ${remainingConfirmed}/${game.maxPlayers}.`,
        href: `/portal/games/${gameId}`,
      },
      tx,
    );

    const offered = await offerNextWaitlistPlayer(tx, gameId, offerMinutes);
    return { gameStatus: nextStatus, offeredWaitlistUserId: offered?.userId ?? null };
  });
}

export async function cancelGame(actorId: string, actorRole: Role, gameId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);
    if (game.organizerId !== actorId && !can(actorRole, "games.moderate")) {
      throw new ForbiddenError("Only the organizer or an administrator can cancel this game.");
    }
    assertTransition(game.status, "CANCELLED");

    await tx.game.update({
      where: { id: gameId },
      data: { status: "CANCELLED" },
    });
    await tx.gameWaitlist.updateMany({
      where: { gameId, status: { in: ["WAITING", "OFFERED"] } },
      data: { status: "EXPIRED" },
    });

    const targets = game.participants
      .filter((p) => p.userId !== actorId && (p.status === "CONFIRMED" || p.status === "REQUESTED"))
      .map((p) => p.userId);
    await notifyUsers(
      targets,
      {
        type: "GAME_CANCELLED",
        title: "Game cancelled",
        body: "A scheduled game you were part of has been cancelled.",
        href: `/portal/games/${gameId}`,
      },
      tx,
    );
    return { status: "CANCELLED" as const };
  });
}

export async function joinWaitlist(userId: string, gameId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    await requirePlayableMembership(userId, tx);

    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);
    if (game.status !== "FULL" && game.status !== "WAITING_FOR_REPLACEMENT") {
      throw new AppError("Waitlist is only available for full games or games waiting for a replacement.");
    }
    const existingParticipant = game.participants.find((p) => p.userId === userId);
    if (existingParticipant?.status === "CONFIRMED") {
      throw new AppError("You are already confirmed in this game.");
    }

    const existingEntry = await tx.gameWaitlist.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });
    if (existingEntry && (existingEntry.status === "WAITING" || existingEntry.status === "OFFERED")) {
      return existingEntry;
    }

    const last = await tx.gameWaitlist.findFirst({
      where: { gameId },
      orderBy: { position: "desc" },
    });
    const position = (last?.position ?? 0) + 1;

    return tx.gameWaitlist.upsert({
      where: { gameId_userId: { gameId, userId } },
      update: { position, status: "WAITING", offeredAt: null, offerExpiresAt: null },
      create: { gameId, userId, position, status: "WAITING" },
    });
  });
}

export async function respondToWaitlistOffer(
  userId: string,
  gameId: string,
  decision: "ACCEPT" | "DECLINE",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    const settings = await getSettings(tx);
    const offerMinutes = Number(settings["game.offer_minutes"]);
    const durationMin = Number(settings["game.duration_minutes"]);
    const now = new Date();

    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);

    const entry = await tx.gameWaitlist.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });
    if (!entry || entry.status !== "OFFERED") {
      throw new AppError("You do not have an active waitlist offer for this game.");
    }

    if (entry.offerExpiresAt && entry.offerExpiresAt.getTime() < now.getTime()) {
      await tx.gameWaitlist.update({ where: { id: entry.id }, data: { status: "EXPIRED" } });
      await offerNextWaitlistPlayer(tx, gameId, offerMinutes, now);
      throw new AppError("This waitlist offer has expired and moved to the next player.");
    }

    if (decision === "DECLINE") {
      await tx.gameWaitlist.update({ where: { id: entry.id }, data: { status: "DECLINED" } });
      await offerNextWaitlistPlayer(tx, gameId, offerMinutes, now);
      return { accepted: false, gameStatus: game.status };
    }

    await requirePlayableMembership(userId, tx);
    const confirmedCount = game.participants.filter((p) => p.status === "CONFIRMED").length;
    if (confirmedCount >= game.maxPlayers) {
      throw new AppError("No open slot remains in this game.");
    }
    await assertNoSlotOverlap(
      tx,
      userId,
      {
        date: isoDate(game.date),
        period: game.period,
        startTime: game.startTime,
        durationMin,
      },
      game.id,
    );

    await tx.gameParticipant.upsert({
      where: { gameId_userId: { gameId, userId } },
      update: { status: "CONFIRMED" },
      create: { gameId, userId, status: "CONFIRMED" },
    });
    await tx.gameWaitlist.update({
      where: { id: entry.id },
      data: { status: "PROMOTED" },
    });

    const nextStatus = statusAfterRosterChange({
      count: confirmedCount + 1,
      max: game.maxPlayers,
      current: game.status,
      started: Boolean(game.startedAt),
      replacementOpen: game.status === "WAITING_FOR_REPLACEMENT",
    });

    await tx.game.update({
      where: { id: gameId },
      data: { status: nextStatus },
    });

    await notifyUsers(
      [game.organizerId],
      {
        type: "PLAYER_JOINED",
        title: "Waitlist player joined",
        body: `A player from the waiting list accepted the open slot (${confirmedCount + 1}/${game.maxPlayers}).`,
        href: `/portal/games/${gameId}`,
      },
      tx,
    );

    return { accepted: true, gameStatus: nextStatus };
  });
}

export async function updateGameLifecycle(
  actorId: string,
  actorRole: Role,
  gameId: string,
  action: "START" | "COMPLETE" | "INCOMPLETE" | "OPEN_REPLACEMENT",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);
    const isStaffOrAdmin = can(actorRole, "attendance.view") || can(actorRole, "games.moderate");
    if (game.organizerId !== actorId && !isStaffOrAdmin) {
      throw new ForbiddenError("Only the organizer or stadium staff can update this game state.");
    }

    const confirmedCount = game.participants.filter((p) => p.status === "CONFIRMED").length;
    const now = new Date();

    if (action === "START") {
      if (!canStartGame(game.gameType, confirmedCount)) {
        throw new AppError("At least 2 confirmed players are required to start.");
      }
      assertTransition(game.status, "IN_PROGRESS");
      return tx.game.update({
        where: { id: gameId },
        data: { status: "IN_PROGRESS", startedAt: game.startedAt ?? now },
      });
    }

    if (action === "COMPLETE") {
      assertTransition(game.status, "COMPLETED");
      return tx.game.update({
        where: { id: gameId },
        data: { status: "COMPLETED", completedAt: now },
      });
    }

    if (action === "INCOMPLETE") {
      assertTransition(game.status, "INCOMPLETE");
      return tx.game.update({
        where: { id: gameId },
        data: { status: "INCOMPLETE", completedAt: now },
      });
    }

    assertTransition(game.status, "WAITING_FOR_REPLACEMENT");
    const updated = await tx.game.update({
      where: { id: gameId },
      data: { status: "WAITING_FOR_REPLACEMENT" },
    });
    const settings = await getSettings(tx);
    await offerNextWaitlistPlayer(tx, gameId, Number(settings["game.offer_minutes"]), now);
    return updated;
  });
}

export async function recordGameAttendance(
  actorId: string,
  actorRole: Role,
  gameId: string,
  marks: Array<{ userId: string; status: "PRESENT" | "ABSENT" }>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (!game) throw new AppError("Game not found.", 404);
    const isStaffOrAdmin = can(actorRole, "attendance.view") || can(actorRole, "games.moderate");
    if (game.organizerId !== actorId && !isStaffOrAdmin) {
      throw new ForbiddenError("Only the organizer or stadium staff can record attendance.");
    }

    const settings = await getSettings(tx);
    const threshold = Number(settings["game.noshow_flag_threshold"]);
    const validParticipants = new Set(
      game.participants
        .filter((p) => p.status === "CONFIRMED" || p.status === "NO_SHOW")
        .map((p) => p.userId),
    );

    for (const mark of marks) {
      if (!validParticipants.has(mark.userId)) continue;
      await tx.gameAttendance.upsert({
        where: { gameId_userId: { gameId, userId: mark.userId } },
        update: { status: mark.status, markedById: actorId, markedAt: new Date() },
        create: { gameId, userId: mark.userId, status: mark.status, markedById: actorId },
      });
      await tx.gameParticipant.update({
        where: { gameId_userId: { gameId, userId: mark.userId } },
        data: { status: mark.status === "ABSENT" ? "NO_SHOW" : "CONFIRMED" },
      });
      const noShowCount = await tx.gameAttendance.count({
        where: { userId: mark.userId, status: "ABSENT" },
      });
      await tx.playerProfile.updateMany({
        where: { userId: mark.userId },
        data: {
          noShowCount,
          flaggedForReview: noShowCount >= threshold,
        },
      });
    }
  });
}

export async function processGameRemindersAndExpiries(now = new Date()) {
  const settings = await getSettings();
  const offerMinutes = Number(settings["game.offer_minutes"]);

  // 1. Expire stale waitlist offers and cascade to next waiting member
  const expiredOffers = await prisma.gameWaitlist.findMany({
    where: { status: "OFFERED", offerExpiresAt: { lt: now } },
    select: { id: true, gameId: true },
  });

  let cascaded = 0;
  for (const offer of expiredOffers) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM games WHERE id = ${offer.gameId} FOR UPDATE`;
      const current = await tx.gameWaitlist.findUnique({ where: { id: offer.id } });
      if (!current || current.status !== "OFFERED") return;
      await tx.gameWaitlist.update({ where: { id: current.id }, data: { status: "EXPIRED" } });
      const next = await offerNextWaitlistPlayer(tx, offer.gameId, offerMinutes, now);
      if (next) cascaded += 1;
    });
  }

  // 2. Send reminders for games starting in the next 2 hours
  const todayIso = kolkataParts(now).date;
  const tomorrowIso = addDays(todayIso, 1);
  const upcomingGames = await prisma.game.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      date: { in: [dateFromIso(todayIso), dateFromIso(tomorrowIso)] },
    },
    include: {
      participants: { where: { status: "CONFIRMED" } },
    },
  });

  let remindersSent = 0;
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const recentCutoff = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  for (const game of upcomingGames) {
    const startAt = scheduledStart(isoDate(game.date), game.startTime, game.period);
    const diff = startAt.getTime() - now.getTime();
    if (diff <= 0 || diff > twoHoursMs) continue;
    const href = `/portal/games/${game.id}`;
    const alreadyReminded = await prisma.notification.findFirst({
      where: { type: "GAME_REMINDER", href, createdAt: { gte: recentCutoff } },
    });
    if (alreadyReminded) continue;

    await notifyUsers(
      game.participants.map((p) => p.userId),
      {
        type: "GAME_REMINDER",
        title: "Upcoming game reminder",
        body: `Your ${game.sport.toLowerCase().replace("_", " ")} ${game.gameType.toLowerCase()} game starts soon. Courts remain first-come-first-served.`,
        href,
      },
    );
    remindersSent += game.participants.length;
  }

  // 3. Sync memberships expiring soon / expired
  const memberships = await prisma.membership.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    select: { userId: true, status: true },
  });
  let membershipChanges = 0;
  for (const row of memberships) {
    const updated = await syncMembership(row.userId);
    if (updated && updated.status !== row.status) {
      membershipChanges += 1;
      await notifyUsers([row.userId], {
        type: "MEMBERSHIP_EXPIRY",
        title: updated.status === "EXPIRED" ? "Membership expired" : "Membership expiring soon",
        body:
          updated.status === "EXPIRED"
            ? "Your stadium membership has expired. Renew (₹1,000/month) to resume joining games and facilities."
            : "Your stadium membership is expiring soon. Renew online or at the stadium desk to avoid interruption.",
        href: "/portal/membership",
      });
    }
  }

  return {
    expiredOffers: expiredOffers.length,
    cascadedOffers: cascaded,
    remindersSent,
    membershipChanges,
  };
}
