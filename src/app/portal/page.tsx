import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { AlertBanner, Card, StatCard, StatusPill } from "@/components/ui/primitives";
import { canUseFacilities } from "@/domain/membership";
import { prisma } from "@/lib/db";
import { formatDay, formatWhen } from "@/lib/format";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Member Portal" };

export default async function MemberDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal");

  const membershipStatus = user.membership?.status ?? "PENDING";
  const playable = canUseFacilities(membershipStatus);

  const [myGames, openGames, badmintonCourts, notifications] = await Promise.all([
    prisma.game.findMany({
      where: {
        status: { in: ["OPEN", "FULL", "IN_PROGRESS", "WAITING_FOR_REPLACEMENT"] },
        participants: { some: { userId: user.id, status: { in: ["CONFIRMED", "REQUESTED"] } } },
      },
      include: {
        participants: { where: { status: "CONFIRMED" }, select: { id: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
      take: 5,
    }),
    prisma.game.findMany({
      where: { status: { in: ["OPEN", "WAITING_FOR_REPLACEMENT"] } },
      include: {
        organizer: { select: { name: true } },
        participants: { where: { status: "CONFIRMED" }, select: { id: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
      take: 4,
    }),
    prisma.court.findMany({
      where: { facility: { kind: "BADMINTON" } },
      orderBy: { code: "asc" },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const openCourtCount = badmintonCourts.filter((c) => c.status === "AVAILABLE").length;

  return (
    <PortalShell
      section="member"
      title={`Welcome back, ${user.name}`}
      subtitle="Manage your membership, find badminton partners, and check live court availability."
    >
      {!playable ? (
        <AlertBanner
          tone="warning"
          title={`Membership status: ${membershipStatus}`}
          body="Complete your initial ₹5,000 activation or ₹1,000 monthly renewal in the Membership tab to join games, register for yoga, or enter court queues."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Membership"
          value={membershipStatus.replace("_", " ")}
          hint={user.membership?.expiresAt ? `Valid until ${formatWhen(user.membership.expiresAt)}` : "Activation required"}
          accent
        />
        <StatCard label="My Active Games" value={myGames.length} hint="Confirmed or requested" />
        <StatCard label="Badminton Courts Open" value={`${openCourtCount}/${badmintonCourts.length}`} hint="First-come-first-served" />
        <StatCard
          label="No-Show Count"
          value={user.playerProfile?.noShowCount ?? 0}
          hint={user.playerProfile?.flaggedForReview ? "Flagged for admin review" : "Good standing"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--navy-900)]">My Upcoming Games</h2>
            <Link href="/portal/games" className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
              All games →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {myGames.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">You have no upcoming games. Join an open slot or create one.</p>
            ) : (
              myGames.map((g) => (
                <Link
                  key={g.id}
                  href={`/portal/games/${g.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 hover:border-[var(--stadium-blue)]"
                >
                  <div>
                    <p className="text-sm font-bold text-[var(--navy-900)]">
                      {g.sport.replace("_", " ")} {g.gameType} · {formatDay(g.date)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {g.period} {g.startTime ? `(${g.startTime})` : ""} · {g.participants.length}/{g.maxPlayers} confirmed
                    </p>
                  </div>
                  <StatusPill status={g.status} />
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--navy-900)]">Open Games Seeking Players</h2>
            <Link href="/portal/games" className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
              Browse / Create →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {openGames.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No open games right now.</p>
            ) : (
              openGames.map((g) => (
                <Link
                  key={g.id}
                  href={`/portal/games/${g.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 hover:border-[var(--stadium-blue)]"
                >
                  <div>
                    <p className="text-sm font-bold text-[var(--navy-900)]">
                      {g.sport.replace("_", " ")} {g.gameType} · {formatDay(g.date)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      By {g.organizer.name} · {g.participants.length}/{g.maxPlayers} · {g.joinMode}
                    </p>
                  </div>
                  <StatusPill status={g.status} />
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Recent Notifications</h2>
          <Link href="/portal/notifications" className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
            View inbox →
          </Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {notifications.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--navy-900)]">{n.title}</p>
                  <p className="text-xs text-[var(--muted)]">{n.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">{formatWhen(n.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </PortalShell>
  );
}
