import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { Card, StatCard, StatusPill } from "@/components/ui/primitives";
import { can } from "@/domain/permissions";
import { isStatusStale } from "@/domain/staleness";
import { prisma } from "@/lib/db";
import { formatDay, formatWhen } from "@/lib/format";
import { getCurrentUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Staff Overview" };

export default async function StaffOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/staff");
  if (!can(user.role, "courts.update")) redirect("/portal");

  const now = new Date();
  const [settings, courts, openCheckIns, openReports, activeGames] = await Promise.all([
    getSettings(),
    prisma.court.findMany({
      include: { facility: { select: { name: true, kind: true } } },
      orderBy: [{ facility: { kind: "asc" } }, { code: "asc" }],
    }),
    prisma.facilityCheckIn.count({ where: { checkedOutAt: null } }),
    prisma.facilityReport.findMany({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      include: { facility: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.game.findMany({
      where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS", "WAITING_FOR_REPLACEMENT"] } },
      include: { participants: { where: { status: "CONFIRMED" }, select: { id: true } } },
      orderBy: [{ date: "asc" }, { period: "asc" }],
      take: 6,
    }),
  ]);

  const staleMinutes = Number(settings["facility.stale_minutes"]);
  const availableCourts = courts.filter((c) => c.status === "AVAILABLE").length;

  return (
    <PortalShell
      section="staff"
      title="Staff Operations Desk"
      subtitle="Monitor official court statuses, verify front-desk check-ins, track attendance, and resolve facility issues."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Courts / Tables" value={`${availableCourts}/${courts.length}`} accent />
        <StatCard label="Active Check-Ins" value={openCheckIns} hint="Members currently inside" />
        <StatCard label="Active Games" value={activeGames.length} hint="Open or in progress" />
        <StatCard label="Open Facility Issues" value={openReports.length} hint="Open or acknowledged" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--navy-900)]">Official Courts & Tables</h2>
            <Link href="/staff/courts" className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
              Update Statuses →
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {courts.map((c) => {
              const stale = isStatusStale(c.statusUpdatedAt, now, staleMinutes);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--navy-900)]">
                      {c.code} · {c.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {c.facility.name} · {formatWhen(c.statusUpdatedAt)}
                      {stale ? " · Stale" : ""}
                    </p>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--navy-900)]">Upcoming Match Attendance</h2>
            <Link href="/staff/attendance" className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
              Attendance Desk →
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {activeGames.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No active games scheduled.</p>
            ) : (
              activeGames.map((g) => (
                <Link
                  key={g.id}
                  href={`/portal/games/${g.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3.5 py-2.5 hover:border-[var(--stadium-blue)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--navy-900)]">
                      {g.sport.replace("_", " ")} · {g.gameType}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDay(g.date)} · {g.period} · {g.participants.length}/{g.maxPlayers} confirmed
                    </p>
                  </div>
                  <StatusPill status={g.status} />
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </PortalShell>
  );
}
