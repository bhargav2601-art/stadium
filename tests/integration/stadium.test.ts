import "dotenv/config";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { signWebhookBody } from "@/domain/payments";
import { addDays, kolkataParts } from "@/domain/time";

let prisma: (typeof import("@/lib/db"))["prisma"];
let authSvc: typeof import("@/server/auth");
let settingsSvc: typeof import("@/server/settings");
let membershipSvc: typeof import("@/server/membership");
let paymentSvc: typeof import("@/server/payments");
let gameSvc: typeof import("@/server/games");
let facilitySvc: typeof import("@/server/facilities");

async function resetTestDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      admin_audit_logs,
      notifications,
      notification_preferences,
      member_reports,
      user_blocks,
      messages,
      basketball_sessions,
      basketball_interest,
      yoga_registrations,
      yoga_sessions,
      game_attendance,
      game_waitlists,
      game_participants,
      games,
      player_availability,
      staff_assignments,
      facility_reports,
      facility_checkins,
      court_queue,
      court_status_history,
      courts,
      facility_schedules,
      facilities,
      payment_webhook_events,
      payments,
      memberships,
      membership_plans,
      player_profiles,
      sessions,
      profiles,
      application_settings
    RESTART IDENTITY CASCADE
  `);

  await settingsSvc.ensureSettings();

  await prisma.membershipPlan.createMany({
    data: [
      {
        code: "INITIAL",
        name: "Initial Stadium Membership",
        amountPaise: 500000,
        intervalDays: 30,
        active: true,
      },
      {
        code: "MONTHLY_RENEWAL",
        name: "Monthly Membership Renewal",
        amountPaise: 100000,
        intervalDays: 30,
        active: true,
      },
    ],
  });

  const badminton = await prisma.facility.create({
    data: {
      kind: "BADMINTON",
      name: "Badminton Hall",
      summary: "4 courts",
      description: "4 indoor badminton courts.",
    },
  });
  await prisma.court.createMany({
    data: [
      { facilityId: badminton.id, code: "B1", name: "Court 1" },
      { facilityId: badminton.id, code: "B2", name: "Court 2" },
      { facilityId: badminton.id, code: "B3", name: "Court 3" },
      { facilityId: badminton.id, code: "B4", name: "Court 4" },
    ],
  });

  const tt = await prisma.facility.create({
    data: {
      kind: "TABLE_TENNIS",
      name: "Table Tennis Zone",
      summary: "2 tables",
      description: "2 table tennis tables.",
    },
  });
  await prisma.court.createMany({
    data: [
      { facilityId: tt.id, code: "TT1", name: "Table 1" },
      { facilityId: tt.id, code: "TT2", name: "Table 2" },
    ],
  });

  await prisma.facility.createMany({
    data: [
      { kind: "GYM", name: "Conditioning Gym", summary: "Gym", description: "Gym facility." },
      { kind: "YOGA", name: "Morning Yoga", summary: "Morning Yoga", description: "Morning-only yoga." },
      {
        kind: "BASKETBALL",
        name: "Basketball Mode",
        summary: "Shared Floor",
        description: "Shared basketball floor.",
      },
    ],
  });
}

async function createActiveMember(name: string, email: string) {
  const user = await authSvc.registerAccount({
    name,
    email,
    password: "MemberPass#2026",
  });
  const membership = await prisma.membership.findUniqueOrThrow({ where: { userId: user.id } });
  await prisma.$transaction((tx) =>
    membershipSvc.activateMembership({
      tx,
      membershipId: membership.id,
      periodDays: 30,
    }),
  );
  return user;
}

describe("Anil Kumble Stadium — PostgreSQL integration suite", () => {
  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL?.trim();
    if (!testUrl || !testUrl.includes("_test")) {
      throw new Error("TEST_DATABASE_URL must be configured and point to a *_test PostgreSQL database.");
    }
    process.env.DATABASE_URL = testUrl;

    const dbMod = await import("@/lib/db");
    prisma = dbMod.prisma;
    authSvc = await import("@/server/auth");
    settingsSvc = await import("@/server/settings");
    membershipSvc = await import("@/server/membership");
    paymentSvc = await import("@/server/payments");
    gameSvc = await import("@/server/games");
    facilitySvc = await import("@/server/facilities");

    await resetTestDatabase();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it("authenticates users, validates sessions, and invalidates tokens on password change", async () => {
    const user = await authSvc.registerAccount({
      name: "Rohan Mehta",
      email: "rohan.auth@example.com",
      password: "Password#123",
    });
    expect(user.role).toBe("MEMBER");

    const authed = await authSvc.authenticate("rohan.auth@example.com", "Password#123");
    expect(authed.id).toBe(user.id);

    await expect(authSvc.authenticate("rohan.auth@example.com", "WrongPass")).rejects.toThrow();

    const session = await authSvc.startSession(user.id);
    const loaded = await authSvc.userForToken(session.token);
    expect(loaded?.id).toBe(user.id);

    await authSvc.changePassword(user.id, "Password#123", "UpdatedPass#456");
    expect(await authSvc.userForToken(session.token)).toBeNull();
    const relogin = await authSvc.authenticate("rohan.auth@example.com", "UpdatedPass#456");
    expect(relogin.id).toBe(user.id);
  });

  it("enforces membership pricing (₹5,000 initial, ₹1,000 renewal), signature checks, webhook idempotency, offline approval, and expiry", async () => {
    const pendingUser = await authSvc.registerAccount({
      name: "Meera Nair",
      email: "meera.pay@example.com",
      password: "Password#123",
    });

    const slotDate = addDays(kolkataParts().date, 2);
    await expect(
      gameSvc.createGame(pendingUser.id, {
        sport: "BADMINTON",
        gameType: "SINGLES",
        date: slotDate,
        period: "MORNING",
        startTime: "07:00",
        maxPlayers: 2,
        joinMode: "OPEN",
      }),
    ).rejects.toThrow(/active membership/i);

    const initialOrder = await paymentSvc.createOnlinePaymentOrder(pendingUser.id);
    if (initialOrder.mode !== "sandbox") throw new Error("Expected sandbox mode");
    expect(initialOrder.purpose).toBe("INITIAL");
    expect(initialOrder.amountPaise).toBe(500000);

    await expect(
      paymentSvc.verifyOnlinePayment(pendingUser.id, {
        orderId: initialOrder.orderId,
        paymentId: initialOrder.suggestedPaymentId,
        signature: "0".repeat(64),
      }),
    ).rejects.toThrow(/signature verification failed/i);

    const paid = await paymentSvc.verifyOnlinePayment(pendingUser.id, {
      orderId: initialOrder.orderId,
      paymentId: initialOrder.suggestedPaymentId,
      signature: initialOrder.signature,
    });
    expect(paid.payment.status).toBe("PAID");
    expect(paid.payment.receiptNumber).toMatch(/^AKS-/);
    expect(paid.membership?.status).toBe("ACTIVE");

    const renewalOrder = await paymentSvc.createOnlinePaymentOrder(pendingUser.id);
    if (renewalOrder.mode !== "sandbox") throw new Error("Expected sandbox mode");
    expect(renewalOrder.purpose).toBe("RENEWAL");
    expect(renewalOrder.amountPaise).toBe(100000);

    const webhookBody = JSON.stringify({
      event: "payment.captured",
      orderId: renewalOrder.orderId,
      paymentId: renewalOrder.suggestedPaymentId,
    });
    const secret = process.env.SANDBOX_PAYMENT_SECRET!;

    await expect(
      paymentSvc.processPaymentWebhook({
        rawBody: webhookBody,
        signature: "bad_sig",
        provider: "sandbox",
        eventIdHeader: "evt_001",
      }),
    ).rejects.toThrow(/invalid webhook signature/i);

    const firstHook = await paymentSvc.processPaymentWebhook({
      rawBody: webhookBody,
      signature: signWebhookBody(webhookBody, secret),
      provider: "sandbox",
      eventIdHeader: "evt_001",
    });
    expect(firstHook.idempotent).toBe(false);

    const afterFirst = await prisma.membership.findUniqueOrThrow({ where: { userId: pendingUser.id } });
    const replayHook = await paymentSvc.processPaymentWebhook({
      rawBody: webhookBody,
      signature: signWebhookBody(webhookBody, secret),
      provider: "sandbox",
      eventIdHeader: "evt_001",
    });
    expect(replayHook.idempotent).toBe(true);
    const afterReplay = await prisma.membership.findUniqueOrThrow({ where: { userId: pendingUser.id } });
    expect(afterReplay.expiresAt?.getTime()).toBe(afterFirst.expiresAt?.getTime());

    const admin = await authSvc.registerAccount({
      name: "Admin Desk",
      email: "admin.verify@example.com",
      password: "Password#123",
    });
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMINISTRATOR" } });

    const offline = await paymentSvc.submitOfflinePayment(pendingUser.id, "UPI-DESK-991122");
    expect(offline.status).toBe("PENDING_VERIFICATION");
    const approved = await paymentSvc.verifyOfflinePayment(
      admin.id,
      "ADMINISTRATOR",
      offline.id,
      "APPROVE",
    );
    expect(approved.payment.status).toBe("PAID");

    await prisma.membership.update({
      where: { userId: pendingUser.id },
      data: { expiresAt: new Date(Date.now() - 86_400_000), status: "ACTIVE" },
    });
    const expired = await membershipSvc.syncMembership(pendingUser.id);
    expect(expired?.status).toBe("EXPIRED");
    await expect(
      gameSvc.createGame(pendingUser.id, {
        sport: "BADMINTON",
        gameType: "SINGLES",
        date: slotDate,
        period: "MORNING",
        startTime: "08:00",
        maxPlayers: 2,
        joinMode: "OPEN",
      }),
    ).rejects.toThrow(/active membership/i);
  });

  it("prevents slot double-booking on concurrent joins, supports approval games, waitlist cascade, replacement, and no-show flags", async () => {
    const a = await createActiveMember("Player A", "a.match@example.com");
    const b = await createActiveMember("Player B", "b.match@example.com");
    const c = await createActiveMember("Player C", "c.match@example.com");
    const d = await createActiveMember("Player D", "d.match@example.com");
    const staff = await authSvc.registerAccount({
      name: "Court Staff",
      email: "staff.match@example.com",
      password: "Password#123",
    });
    await prisma.user.update({ where: { id: staff.id }, data: { role: "STAFF" } });

    const futureDate = addDays(kolkataParts().date, 3);
    const singlesGame = await gameSvc.createGame(a.id, {
      sport: "BADMINTON",
      gameType: "SINGLES",
      date: futureDate,
      period: "EVENING",
      startTime: "18:00",
      maxPlayers: 2,
      joinMode: "OPEN",
    });

    await expect(
      gameSvc.createGame(a.id, {
        sport: "TABLE_TENNIS",
        gameType: "SINGLES",
        date: futureDate,
        period: "EVENING",
        startTime: "18:30",
        maxPlayers: 2,
        joinMode: "OPEN",
      }),
    ).rejects.toThrow(/overlaps/i);

    const [r1, r2] = await Promise.allSettled([
      gameSvc.joinGame(b.id, singlesGame.id),
      gameSvc.joinGame(c.id, singlesGame.id),
    ]);
    const wins = [r1, r2].filter((r) => r.status === "fulfilled");
    const losses = [r1, r2].filter((r) => r.status === "rejected");
    expect(wins.length).toBe(1);
    expect(losses.length).toBe(1);

    const winnerId = wins[0].status === "fulfilled" ? wins[0].value.participant.userId : b.id;
    const loserId = winnerId === b.id ? c.id : b.id;

    const wait1 = await gameSvc.joinWaitlist(loserId, singlesGame.id);
    const wait2 = await gameSvc.joinWaitlist(d.id, singlesGame.id);
    expect(wait1.position).toBe(1);
    expect(wait2.position).toBe(2);

    const left = await gameSvc.leaveGame(winnerId, singlesGame.id, true);
    expect(left.gameStatus).toBe("WAITING_FOR_REPLACEMENT");
    expect(left.offeredWaitlistUserId).toBe(loserId);

    await prisma.gameWaitlist.update({
      where: { gameId_userId: { gameId: singlesGame.id, userId: loserId } },
      data: { offerExpiresAt: new Date(Date.now() - 60_000) },
    });
    const cronResult = await gameSvc.processGameRemindersAndExpiries();
    expect(cronResult.expiredOffers).toBeGreaterThanOrEqual(1);
    expect(cronResult.cascadedOffers).toBeGreaterThanOrEqual(1);

    const accepted = await gameSvc.respondToWaitlistOffer(d.id, singlesGame.id, "ACCEPT");
    expect(accepted.accepted).toBe(true);
    expect(accepted.gameStatus).toBe("FULL");

    const approvalGame = await gameSvc.createGame(a.id, {
      sport: "BADMINTON",
      gameType: "DOUBLES",
      date: addDays(kolkataParts().date, 4),
      period: "MORNING",
      startTime: "07:00",
      maxPlayers: 4,
      joinMode: "APPROVAL",
    });
    const reqRes = await gameSvc.joinGame(b.id, approvalGame.id);
    expect(reqRes.outcome).toBe("REQUESTED");
    const reviewed = await gameSvc.reviewJoinRequest(a.id, "MEMBER", approvalGame.id, reqRes.participant.id, "APPROVE");
    expect(reviewed.participantStatus).toBe("CONFIRMED");

    for (let i = 0; i < 3; i += 1) {
      const g = await gameSvc.createGame(a.id, {
        sport: "BADMINTON",
        gameType: "SINGLES",
        date: addDays(kolkataParts().date, 6 + i),
        period: "MORNING",
        startTime: "07:00",
        maxPlayers: 2,
        joinMode: "OPEN",
      });
      await gameSvc.joinGame(d.id, g.id);
      await gameSvc.recordGameAttendance(staff.id, "STAFF", g.id, [
        { userId: a.id, status: "PRESENT" },
        { userId: d.id, status: "ABSENT" },
      ]);
    }
    const profileD = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: d.id } });
    expect(profileD.noShowCount).toBe(3);
    expect(profileD.flaggedForReview).toBe(true);
  });

  it("enforces role permissions on courts, morning-only yoga capacity, and manual basketball floor conversion/restore", async () => {
    const member = await createActiveMember("Facility Member", "fac.member@example.com");
    const staff = await authSvc.registerAccount({
      name: "Facility Staff",
      email: "fac.staff@example.com",
      password: "Password#123",
    });
    await prisma.user.update({ where: { id: staff.id }, data: { role: "STAFF" } });
    const admin = await authSvc.registerAccount({
      name: "Facility Admin",
      email: "fac.admin@example.com",
      password: "Password#123",
    });
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMINISTRATOR" } });

    const b1 = await prisma.court.findFirstOrThrow({ where: { code: "B1" } });

    await expect(
      facilitySvc.updateCourtStatus(member.id, "MEMBER", b1.id, { status: "OCCUPIED" }),
    ).rejects.toThrow(/permission|staff/i);
    await expect(
      facilitySvc.scheduleBasketballSession(staff.id, "STAFF", {
        startsAt: new Date(Date.now() + 3_600_000),
        endsAt: new Date(Date.now() + 7_200_000),
        publish: true,
      }),
    ).rejects.toThrow(/management/i);
    await expect(
      facilitySvc.createYogaSession(staff.id, "STAFF", {
        title: "Unauthorized Staff Yoga",
        startsAt: new Date(`${addDays(kolkataParts().date, 5)}T07:00:00+05:30`),
        endsAt: new Date(`${addDays(kolkataParts().date, 5)}T08:00:00+05:30`),
        capacity: 10,
      }),
    ).rejects.toThrow(/admin|management/i);
    await expect(
      paymentSvc.verifyOfflinePayment(staff.id, "STAFF", "nonexistent", "APPROVE"),
    ).rejects.toThrow(/admin/i);

    const guardsMod = await import("@/server/guards");
    expect(() =>
      guardsMod.assertSameOrigin(
        new Request("https://stadium.local/api/admin/settings", {
          method: "PATCH",
          headers: { origin: "https://evil.example.com", host: "stadium.local" },
        }),
      ),
    ).toThrow(/cross-origin request blocked/i);

    const updatedCourt = await facilitySvc.updateCourtStatus(staff.id, "STAFF", b1.id, {
      status: "OCCUPIED",
      note: "Match in play",
    });
    expect(updatedCourt.status).toBe("OCCUPIED");

    const dayIso = addDays(kolkataParts().date, 5);
    await expect(
      facilitySvc.createYogaSession(admin.id, "ADMINISTRATOR", {
        title: "Invalid Evening Yoga",
        startsAt: new Date(`${dayIso}T18:00:00+05:30`),
        endsAt: new Date(`${dayIso}T19:00:00+05:30`),
        capacity: 10,
      }),
    ).rejects.toThrow(/morning/i);

    const morningYoga = await facilitySvc.createYogaSession(admin.id, "ADMINISTRATOR", {
      title: "Morning Mobility",
      startsAt: new Date(`${dayIso}T07:00:00+05:30`),
      endsAt: new Date(`${dayIso}T08:00:00+05:30`),
      capacity: 1,
    });
    await facilitySvc.registerForYoga(member.id, morningYoga.id);
    const secondMember = await createActiveMember("Yoga Second", "yoga2@example.com");
    await expect(facilitySvc.registerForYoga(secondMember.id, morningYoga.id)).rejects.toThrow(/capacity/i);

    const interestRes = await facilitySvc.setBasketballInterest(member.id, true, "Evening 5v5");
    expect(interestRes.interested).toBe(true);
    const courtsBeforeApproval = await prisma.court.findMany({ where: { facility: { kind: "BADMINTON" } } });
    expect(courtsBeforeApproval.every((c) => c.status !== "BASKETBALL")).toBe(true);

    const bbStart = new Date(`${dayIso}T19:00:00+05:30`);
    const bbEnd = new Date(`${dayIso}T20:30:00+05:30`);
    const bbSession = await facilitySvc.scheduleBasketballSession(admin.id, "ADMINISTRATOR", {
      startsAt: bbStart,
      endsAt: bbEnd,
      notes: "Full court conversion",
      publish: true,
    });

    const courtsDuring = await prisma.court.findMany({ where: { facility: { kind: "BADMINTON" } } });
    expect(courtsDuring.every((c) => c.status === "BASKETBALL")).toBe(true);

    await expect(
      gameSvc.createGame(member.id, {
        sport: "BADMINTON",
        gameType: "SINGLES",
        date: dayIso,
        period: "EVENING",
        startTime: "19:30",
        maxPlayers: 2,
        joinMode: "OPEN",
      }),
    ).rejects.toThrow(/basketball/i);

    await facilitySvc.toggleBasketballSessionState(admin.id, "ADMINISTRATOR", bbSession.id, "END");
    const courtsAfter = await prisma.court.findMany({ where: { facility: { kind: "BADMINTON" } } });
    expect(courtsAfter.every((c) => c.status === "AVAILABLE")).toBe(true);
  });
});
