import { prisma } from "@/lib/db";
import type { Tx } from "@/lib/db";

export const SETTING_DEFAULTS = {
  "membership.initial_paise": "500000",
  "membership.monthly_paise": "100000",
  "membership.period_days": "30",
  "membership.expiry_soon_days": "7",
  "membership.grace_days": "0",
  "game.offer_minutes": "30",
  "game.grace_minutes": "15",
  "game.duration_minutes": "60",
  "game.noshow_flag_threshold": "3",
  "facility.stale_minutes": "15",
  "stadium.address": "Not set — add the stadium address in system settings",
  "stadium.phone": "Not set — add the stadium phone in system settings",
  "stadium.email": "Not set — add the stadium email in system settings",
  "stadium.hours_note": "Provisional hours. Confirm with stadium management before relying on them.",
  "stadium.name": "Anil Kumble Stadium",
  "stadium.tagline": "Play Together. Stay Active. Belong to a Community.",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function ensureSettings(db: Tx | typeof prisma = prisma) {
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await db.applicationSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

export async function getSettings(db: Tx | typeof prisma = prisma) {
  const rows = await db.applicationSetting.findMany();
  const settings: Record<SettingKey, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (row.key in settings) settings[row.key as SettingKey] = row.value;
  }
  return settings;
}

export async function updateSettings(entries: Partial<Record<SettingKey, string>>) {
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.applicationSetting.upsert({
        where: { key },
        update: { value: value ?? "" },
        create: { key, value: value ?? "" },
      }),
    ),
  );
}
