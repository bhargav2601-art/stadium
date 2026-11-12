import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { SettingsAuditClient } from "@/components/admin/SettingsAuditClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Settings & Audit" };

const SETTING_HINTS: Record<string, string> = {
  "membership.initial_paise": "Initial fee in paise (₹5,000 = 500000)",
  "membership.monthly_paise": "Monthly renewal in paise (₹1,000 = 100000)",
  "membership.period_days": "Days added per activation or renewal",
  "membership.expiry_soon_days": "Days before expiry to show EXPIRING_SOON banner",
  "membership.grace_days": "Post-expiry grace window in days",
  "game.offer_minutes": "Waitlist spot offer validity window in minutes",
  "game.grace_minutes": "Game start grace window in minutes",
  "game.duration_minutes": "Nominal game slot duration for overlap checks",
  "game.noshow_flag_threshold": "No-shows before member is flagged for review",
  "facility.stale_minutes": "Minutes before unchanged court status shows stale badge",
  "stadium.address": "Public physical stadium address",
  "stadium.phone": "Public stadium desk phone",
  "stadium.email": "Public stadium support email",
  "stadium.hours_note": "Operating hours guidance / provisional notice",
  "stadium.name": "Display name across site & receipts",
  "stadium.tagline": "Public hero tagline",
};

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/settings");
  if (!can(user.role, "members.manage")) redirect("/portal");

  const canEditCritical = can(user.role, "settings.critical");
  const canReadAudit = can(user.role, "audit.read");

  const [settingsMap, auditLogs] = await Promise.all([
    getSettings(),
    canReadAudit
      ? prisma.adminAuditLog.findMany({
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 60,
        })
      : Promise.resolve([]),
  ]);

  return (
    <PortalShell
      section="admin"
      title="System Settings & Audit Logs"
      subtitle="Configure stadium contact metadata, pricing, thresholds, and inspect administrative audit logs."
    >
      <SettingsAuditClient
        canEditCritical={canEditCritical}
        settings={Object.entries(settingsMap).map(([key, value]) => ({
          key,
          value,
          description: SETTING_HINTS[key] ?? null,
        }))}
        auditLogs={auditLogs.map((log) => ({
          id: log.id,
          actorName: log.actor.name,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </PortalShell>
  );
}
