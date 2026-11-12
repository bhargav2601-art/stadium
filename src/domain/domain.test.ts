import { describe, expect, it } from "vitest";
import {
  assertMaxPlayers,
  assertTransition,
  canStartGame,
  canTransition,
  openSlots,
  statusAfterRosterChange,
} from "./game-state";
import {
  canUseFacilities,
  extendExpiry,
  paymentPurpose,
  resolveMembershipStatus,
} from "./membership";
import { slotsOverlap } from "./overlap";
import {
  signOrderPayment,
  signWebhookBody,
  verifyOrderSignature,
  verifyWebhookSignature,
} from "./payments";
import { assertCan, can, canAssignRole } from "./permissions";
import { isStatusStale } from "./staleness";
import { cleanText, safeNextPath } from "./text";
import { addDays, isSlotInPast, kolkataParts, scheduledStart } from "./time";

describe("game-state domain rules", () => {
  it("enforces valid status transitions and rejects invalid ones", () => {
    expect(canTransition("OPEN", "FULL")).toBe(true);
    expect(canTransition("OPEN", "OPEN")).toBe(true);
    expect(canTransition("COMPLETED", "OPEN")).toBe(false);
    expect(() => assertTransition("COMPLETED", "IN_PROGRESS")).toThrow();
  });

  it("enforces player caps for singles and doubles", () => {
    expect(() => assertMaxPlayers("SINGLES", 2)).not.toThrow();
    expect(() => assertMaxPlayers("SINGLES", 3)).toThrow();
    expect(() => assertMaxPlayers("DOUBLES", 4)).not.toThrow();
    expect(() => assertMaxPlayers("DOUBLES", 2)).not.toThrow();
    expect(() => assertMaxPlayers("DOUBLES", 1)).toThrow();
    expect(() => assertMaxPlayers("DOUBLES", 5)).toThrow();
  });

  it("computes start eligibility and roster change transitions", () => {
    expect(canStartGame("SINGLES", 1)).toBe(false);
    expect(canStartGame("SINGLES", 2)).toBe(true);
    expect(canStartGame("DOUBLES", 2)).toBe(true);
    expect(openSlots(3, 4)).toBe(1);
    expect(openSlots(5, 4)).toBe(0);

    expect(
      statusAfterRosterChange({ count: 4, max: 4, current: "OPEN", started: false }),
    ).toBe("FULL");
    expect(
      statusAfterRosterChange({ count: 3, max: 4, current: "FULL", started: false }),
    ).toBe("OPEN");
    expect(
      statusAfterRosterChange({
        count: 3,
        max: 4,
        current: "IN_PROGRESS",
        started: true,
        replacementOpen: true,
      }),
    ).toBe("WAITING_FOR_REPLACEMENT");
    expect(
      statusAfterRosterChange({
        count: 4,
        max: 4,
        current: "WAITING_FOR_REPLACEMENT",
        started: true,
      }),
    ).toBe("IN_PROGRESS");
  });
});

describe("membership domain rules", () => {
  const now = new Date("2026-11-12T06:00:00.000Z");

  it("resolves active, expiring soon, expired, and sticky statuses", () => {
    expect(
      resolveMembershipStatus({
        status: "PENDING",
        expiresAt: new Date("2026-12-01T00:00:00Z"),
        now,
        soonDays: 7,
        graceDays: 0,
      }),
    ).toBe("PENDING");
    expect(
      resolveMembershipStatus({
        status: "SUSPENDED",
        expiresAt: new Date("2026-12-01T00:00:00Z"),
        now,
        soonDays: 7,
        graceDays: 0,
      }),
    ).toBe("SUSPENDED");
    expect(
      resolveMembershipStatus({
        status: "ACTIVE",
        expiresAt: new Date("2026-12-12T06:00:00.000Z"),
        now,
        soonDays: 7,
        graceDays: 0,
      }),
    ).toBe("ACTIVE");
    expect(
      resolveMembershipStatus({
        status: "ACTIVE",
        expiresAt: new Date("2026-11-15T06:00:00.000Z"),
        now,
        soonDays: 7,
        graceDays: 0,
      }),
    ).toBe("EXPIRING_SOON");
    expect(
      resolveMembershipStatus({
        status: "ACTIVE",
        expiresAt: new Date("2026-11-10T06:00:00.000Z"),
        now,
        soonDays: 7,
        graceDays: 0,
      }),
    ).toBe("EXPIRED");
    expect(
      resolveMembershipStatus({
        status: "ACTIVE",
        expiresAt: new Date("2026-11-10T06:00:00.000Z"),
        now,
        soonDays: 7,
        graceDays: 3,
      }),
    ).toBe("EXPIRING_SOON");
  });

  it("validates facility access, payment purpose, and expiry extension", () => {
    expect(canUseFacilities("ACTIVE")).toBe(true);
    expect(canUseFacilities("EXPIRING_SOON")).toBe(true);
    expect(canUseFacilities("PENDING")).toBe(false);
    expect(canUseFacilities("EXPIRED")).toBe(false);
    expect(canUseFacilities("SUSPENDED")).toBe(false);
    expect(paymentPurpose(null)).toBe("INITIAL");
    expect(paymentPurpose(now)).toBe("RENEWAL");

    const future = new Date("2026-11-20T00:00:00.000Z");
    expect(extendExpiry(future, now, 30).toISOString()).toBe("2026-12-20T00:00:00.000Z");
    const past = new Date("2026-11-01T00:00:00.000Z");
    expect(extendExpiry(past, now, 30).toISOString()).toBe("2026-12-12T06:00:00.000Z");
  });
});

describe("permissions & role hierarchy", () => {
  it("grants scoped permissions per role", () => {
    expect(can("MEMBER", "games.play")).toBe(true);
    expect(can("MEMBER", "courts.update")).toBe(false);
    expect(can("STAFF", "courts.update")).toBe(true);
    expect(can("STAFF", "payments.verify")).toBe(false);
    expect(can("ADMINISTRATOR", "basketball.schedule")).toBe(true);
    expect(can("ADMINISTRATOR", "pricing.update")).toBe(false);
    expect(can("SUPER_ADMINISTRATOR", "pricing.update")).toBe(true);
    expect(() => assertCan("MEMBER", "audit.read")).toThrow();
  });

  it("prevents privilege escalation and self-demotion", () => {
    expect(canAssignRole("ADMINISTRATOR", "MEMBER", "STAFF", false)).toBe(true);
    expect(canAssignRole("ADMINISTRATOR", "MEMBER", "ADMINISTRATOR", false)).toBe(false);
    expect(canAssignRole("ADMINISTRATOR", "ADMINISTRATOR", "MEMBER", false)).toBe(false);
    expect(canAssignRole("SUPER_ADMINISTRATOR", "MEMBER", "ADMINISTRATOR", false)).toBe(true);
    expect(canAssignRole("SUPER_ADMINISTRATOR", "SUPER_ADMINISTRATOR", "MEMBER", true)).toBe(false);
  });
});

describe("overlap, time, staleness, text & payment signatures", () => {
  it("detects overlapping game slots accurately", () => {
    expect(
      slotsOverlap(
        { date: "2026-11-12", period: "MORNING", startTime: "06:30", durationMin: 60 },
        { date: "2026-11-12", period: "MORNING", startTime: "07:00", durationMin: 60 },
      ),
    ).toBe(true);
    expect(
      slotsOverlap(
        { date: "2026-11-12", period: "MORNING", startTime: "06:30", durationMin: 60 },
        { date: "2026-11-12", period: "MORNING", startTime: "07:30", durationMin: 60 },
      ),
    ).toBe(false);
    expect(
      slotsOverlap(
        { date: "2026-11-12", period: "EVENING", startTime: null, durationMin: 60 },
        { date: "2026-11-12", period: "EVENING", startTime: "18:00", durationMin: 60 },
      ),
    ).toBe(true);
  });

  it("handles Asia/Kolkata dates and evening scheduledStart without day shift", () => {
    expect(addDays("2026-11-12", 3)).toBe("2026-11-15");
    expect(scheduledStart("2026-11-12", "06:00", "MORNING").toISOString()).toBe("2026-11-12T00:30:00.000Z");
    expect(scheduledStart("2026-11-12", "19:00", "EVENING").toISOString()).toBe("2026-11-12T13:30:00.000Z");
    expect(scheduledStart("2026-11-12", "20:30", "EVENING").toISOString()).toBe("2026-11-12T15:00:00.000Z");

    const now = new Date("2026-11-12T04:00:00.000Z"); // 09:30 IST
    expect(kolkataParts(now)).toEqual({ date: "2026-11-12", minutes: 570 });
    expect(isSlotInPast({ date: "2026-11-12", period: "MORNING", startTime: "09:00", now })).toBe(true);
    expect(isSlotInPast({ date: "2026-11-12", period: "EVENING", startTime: "18:00", now })).toBe(false);
  });

  it("verifies HMAC order and webhook signatures safely", () => {
    const secret = "test_secret_123";
    const sig = signOrderPayment("order_1", "pay_1", secret);
    expect(verifyOrderSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig, secret })).toBe(true);
    expect(verifyOrderSignature({ orderId: "order_1", paymentId: "pay_2", signature: sig, secret })).toBe(false);

    const payload = '{"event":"payment.captured"}';
    const webhookSig = signWebhookBody(payload, secret);
    expect(verifyWebhookSignature(payload, webhookSig, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, "deadbeef", secret)).toBe(false);
  });

  it("checks staleness and sanitizes text and redirect paths", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    expect(isStatusStale(new Date("2026-11-12T09:40:00Z"), now, 15)).toBe(true);
    expect(isStatusStale(new Date("2026-11-12T09:50:00Z"), now, 15)).toBe(false);
    expect(cleanText("  <script>Hello</script>   World  ", 50)).toBe("scriptHello/script World");
    expect(safeNextPath("/portal/games", "/portal")).toBe("/portal/games");
    expect(safeNextPath("//evil.com", "/portal")).toBe("/portal");
    expect(safeNextPath("/\\evil.com", "/portal")).toBe("/portal");
    expect(safeNextPath("/portal\nSet-Cookie:x", "/portal")).toBe("/portal");
  });
});
