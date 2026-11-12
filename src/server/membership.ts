import { canUseFacilities, extendExpiry, paymentPurpose, resolveMembershipStatus } from "@/domain/membership";
import { prisma } from "@/lib/db";
import type { Tx } from "@/lib/db";
import { AppError } from "@/server/errors";
import { getSettings } from "@/server/settings";

export async function syncMembership(userId: string, tx: Tx | typeof prisma = prisma) {
  const membership = await tx.membership.findUnique({ where: { userId } });
  if (!membership) return null;
  const settings = await getSettings(tx);
  const status = resolveMembershipStatus({
    status: membership.status,
    expiresAt: membership.expiresAt,
    now: new Date(),
    soonDays: Number(settings["membership.expiry_soon_days"]),
    graceDays: Number(settings["membership.grace_days"]),
  });
  if (status === membership.status) return membership;
  return tx.membership.update({ where: { id: membership.id }, data: { status } });
}

export async function requirePlayableMembership(userId: string, tx: Tx | typeof prisma = prisma) {
  const membership = await syncMembership(userId, tx);
  if (!membership || !canUseFacilities(membership.status)) {
    throw new AppError("An active membership is required for this. Pending, expired, suspended, and cancelled memberships cannot join.");
  }
  return membership;
}

export async function activateMembership(input: {
  tx: Tx;
  membershipId: string;
  periodDays: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const membership = await input.tx.membership.findUniqueOrThrow({ where: { id: input.membershipId } });
  if (membership.status === "SUSPENDED") {
    throw new AppError("This membership is suspended. An administrator has to lift the suspension before it can be renewed.");
  }
  const settings = await getSettings(input.tx);
  const expiresAt = extendExpiry(membership.expiresAt, now, input.periodDays);
  const status = resolveMembershipStatus({
    status: "ACTIVE",
    expiresAt,
    now,
    soonDays: Number(settings["membership.expiry_soon_days"]),
    graceDays: Number(settings["membership.grace_days"]),
  });
  return input.tx.membership.update({
    data: {
      status,
      startedAt: membership.startedAt ?? now,
      expiresAt,
    },
    where: { id: membership.id },
  });
}

export function purposeFor(startedAt: Date | null) {
  return paymentPurpose(startedAt);
}
