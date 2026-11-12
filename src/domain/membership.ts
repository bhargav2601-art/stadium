export const MEMBERSHIP_STATUSES = [
  "PENDING",
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export function resolveMembershipStatus(input: {
  status: MembershipStatus;
  expiresAt: Date | null;
  now: Date;
  soonDays: number;
  graceDays: number;
}): MembershipStatus {
  if (input.status === "PENDING" || input.status === "SUSPENDED" || input.status === "CANCELLED") {
    return input.status;
  }
  if (!input.expiresAt) return "PENDING";
  const graceEnd = input.expiresAt.getTime() + input.graceDays * 86_400_000;
  if (input.now.getTime() > graceEnd) return "EXPIRED";
  if (input.expiresAt.getTime() - input.now.getTime() <= input.soonDays * 86_400_000) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function canUseFacilities(status: MembershipStatus) {
  return status === "ACTIVE" || status === "EXPIRING_SOON";
}

export function paymentPurpose(startedAt: Date | null): "INITIAL" | "RENEWAL" {
  return startedAt ? "RENEWAL" : "INITIAL";
}

export function extendExpiry(current: Date | null, now: Date, periodDays: number) {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + periodDays * 86_400_000);
}
