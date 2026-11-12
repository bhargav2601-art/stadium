import { NextResponse } from "next/server";
import { z } from "zod";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { ForbiddenError } from "@/server/errors";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";
import { SETTING_DEFAULTS, updateSettings, type SettingKey } from "@/server/settings";

const settingsSchema = z.object({
  entries: z.record(z.string(), z.string().max(400)),
});

const PRICING_KEYS = new Set<string>([
  "membership.initial_paise",
  "membership.monthly_paise",
  "membership.period_days",
]);

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireUser();
    if (!can(actor.role, "settings.critical")) {
      throw new ForbiddenError("Only the Super Administrator can modify system and pricing settings.");
    }

    const body = settingsSchema.parse(await request.json());
    const sanitized: Partial<Record<SettingKey, string>> = {};
    for (const [key, value] of Object.entries(body.entries)) {
      if (!(key in SETTING_DEFAULTS)) continue;
      if (PRICING_KEYS.has(key) && (!/^\d+$/.test(value) || Number(value) <= 0)) {
        return NextResponse.json({ error: `Invalid numeric value for ${key}.` }, { status: 400 });
      }
      sanitized[key as SettingKey] = value.trim();
    }

    await updateSettings(sanitized);

    if (sanitized["membership.initial_paise"] || sanitized["membership.period_days"]) {
      await prisma.membershipPlan.updateMany({
        where: { code: "INITIAL" },
        data: {
          ...(sanitized["membership.initial_paise"]
            ? { amountPaise: Number(sanitized["membership.initial_paise"]) }
            : {}),
          ...(sanitized["membership.period_days"]
            ? { intervalDays: Number(sanitized["membership.period_days"]) }
            : {}),
        },
      });
    }

    if (sanitized["membership.monthly_paise"] || sanitized["membership.period_days"]) {
      await prisma.membershipPlan.updateMany({
        where: { code: "MONTHLY_RENEWAL" },
        data: {
          ...(sanitized["membership.monthly_paise"]
            ? { amountPaise: Number(sanitized["membership.monthly_paise"]) }
            : {}),
          ...(sanitized["membership.period_days"]
            ? { intervalDays: Number(sanitized["membership.period_days"]) }
            : {}),
        },
      });
    }

    await audit(actor.id, "settings.update", "ApplicationSetting", "global", sanitized);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
