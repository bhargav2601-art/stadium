import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { Card, StatCard, StatusPill } from "@/components/ui/primitives";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { formatInr, formatWhen } from "@/lib/format";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!can(user.role, "members.manage")) redirect("/portal");

  const [
    activeMembers,
    pendingOffline,
    activeGames,
    basketballInterest,
    recentPayments,
    openIssues,
  ] = await Promise.all([
    prisma.membership.count({ where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } } }),
    prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.game.count({
      where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS", "WAITING_FOR_REPLACEMENT"] } },
    }),
    prisma.basketballInterest.count(),
    prisma.payment.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.facilityReport.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
  ]);

  return (
    <PortalShell
      section="admin"
      title="Stadium Administration"
      subtitle="Manage memberships, verify offline payments, oversee games, schedule yoga/basketball, and review reports."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Memberships" value={activeMembers} accent />
        <StatCard
          label="Pending Offline Payments"
          value={pendingOffline}
          hint="Awaiting desk verification"
        />
        <StatCard label="Active Matchmaking Games" value={activeGames} hint="Singles & Doubles" />
        <StatCard
          label="Basketball Interest"
          value={basketballInterest}
          hint={`${openIssues} open facility issue(s)`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--navy-900)]">Recent Payments</h2>
            <Link href="/admin/payments" className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
              Verify Payments →
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold text-[var(--navy-900)]">{p.user.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.purpose.replace("_", " ")} · {formatInr(p.amountPaise)} · {formatWhen(p.createdAt)}
                  </p>
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Management Shortcuts</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              ["/admin/members", "Members & Roles"],
              ["/admin/payments", "Offline Verification"],
              ["/admin/facilities", "Facilities & Staff"],
              ["/admin/yoga", "Morning Yoga Schedule"],
              ["/admin/basketball", "Basketball Conversion"],
              ["/admin/settings", "Settings & Audit Logs"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-[44px] items-center justify-between rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--navy-900)] hover:border-[var(--stadium-blue)] hover:text-[var(--stadium-blue)]"
              >
                <span>{label}</span>
                <span>→</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </PortalShell>
  );
}
