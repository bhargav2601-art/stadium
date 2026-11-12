import { prisma } from "@/lib/db";
import type { Tx } from "@/lib/db";
import type { NotificationType } from "../../generated/prisma/client";

export async function notifyUsers(
  userIds: string[],
  input: { type: NotificationType; title: string; body: string; href?: string },
  db: Tx | typeof prisma = prisma,
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  const prefs = await db.notificationPreference.findMany({ where: { userId: { in: unique } } });
  const byUser = new Map(prefs.map((pref) => [pref.userId, pref]));
  const rows = unique
    .filter((userId) => {
      const pref = byUser.get(userId);
      if (!pref) return true;
      if (!pref.inApp) return false;
      return !pref.mutedTypes.includes(input.type);
    })
    .map((userId) => ({ userId, ...input }));
  if (rows.length) await db.notification.createMany({ data: rows });
}

export async function notifyAdmins(
  input: { type: NotificationType; title: string; body: string; href?: string },
  db: Tx | typeof prisma = prisma,
) {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"] }, blocked: false },
    select: { id: true },
  });
  await notifyUsers(
    admins.map((admin) => admin.id),
    input,
    db,
  );
}
