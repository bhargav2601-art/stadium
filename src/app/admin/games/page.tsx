import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { Badge, Card, StatusPill } from "@/components/ui/primitives";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { formatDay } from "@/lib/format";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Admin Games Moderation" };

export default async function AdminGamesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/games");
  if (!can(user.role, "games.moderate")) redirect("/portal");

  const games = await prisma.game.findMany({
    include: {
      organizer: { select: { name: true } },
      participants: { where: { status: "CONFIRMED" }, select: { id: true } },
      waitlist: { where: { status: { in: ["WAITING", "OFFERED"] } }, select: { id: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 80,
  });

  return (
    <PortalShell
      section="admin"
      title="Matchmaking Games Oversight"
      subtitle="Inspect active, full, waitlisted, and historical games or open any game room to intervene."
    >
      <div className="space-y-3">
        {games.map((g) => (
          <Card key={g.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="navy">{g.sport.replace("_", " ")}</Badge>
                <Badge tone="blue">{g.gameType}</Badge>
                <StatusPill status={g.status} />
                <span className="text-sm font-bold text-[var(--navy-900)]">
                  {formatDay(g.date)} · {g.period}
                  {g.startTime ? ` (${g.startTime})` : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Organizer: {g.organizer.name} · {g.participants.length}/{g.maxPlayers} confirmed ·{" "}
                {g.waitlist.length} waiting
              </p>
            </div>
            <Link
              href={`/portal/games/${g.id}`}
              className="inline-flex min-h-[38px] items-center rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--navy-900)] hover:border-[var(--stadium-blue)]"
            >
              Manage Room →
            </Link>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
