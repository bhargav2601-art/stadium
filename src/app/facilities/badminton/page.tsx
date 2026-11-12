import Image from "next/image";
import Link from "next/link";
import { AlertBanner, Badge, Card, SectionHeader, StatusPill } from "@/components/ui/primitives";
import { isStatusStale } from "@/domain/staleness";
import { prisma } from "@/lib/db";
import { formatDay, formatWhen } from "@/lib/format";
import { getFacilitiesSnapshot } from "@/server/facilities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Badminton" };

export default async function BadmintonPage() {
  const [snapshot, openGames] = await Promise.all([
    getFacilitiesSnapshot(),
    prisma.game.findMany({
      where: { sport: "BADMINTON", status: { in: ["OPEN", "WAITING_FOR_REPLACEMENT"] } },
      include: {
        organizer: { select: { name: true } },
        participants: { where: { status: "CONFIRMED" }, select: { id: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
      take: 6,
    }),
  ]);

  const facility = snapshot.facilities.find((f) => f.kind === "BADMINTON");
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="4 Indoor Courts"
        title="Badminton at Anil Kumble Stadium"
        subtitle="Hybrid operating model: walk-in physical courts remain first-come-first-served while online matchmaking helps members form singles and doubles squads."
        actionHref="/portal/games"
        actionLabel="Create or Join a Match"
      />

      {snapshot.activeBasketball ? (
        <AlertBanner
          tone="warning"
          title="Badminton Courts Paused for Basketball Session"
          body={`Management activated shared-floor basketball from ${formatWhen(snapshot.activeBasketball.startsAt)} to ${formatWhen(snapshot.activeBasketball.endsAt)}.`}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] lg:col-span-5">
          <Image
            src="/images/hero-badminton.jpg"
            alt="Four indoor badminton courts"
            width={800}
            height={500}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {facility?.courts.map((court) => {
            const stale = isStatusStale(court.statusUpdatedAt, now, snapshot.staleMinutes);
            return (
              <Card key={court.id}>
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="navy">{court.code}</Badge>
                  <StatusPill status={court.status} />
                </div>
                <h2 className="mt-2 text-lg font-bold text-[var(--navy-900)]">{court.name}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {court.statusNote || "Physical court allocation is first-come-first-served."}
                </p>
                <p className="mt-3 text-[11px] font-medium text-slate-500">
                  {stale ? "Needs floor refresh" : `Updated ${formatWhen(court.statusUpdatedAt)}`}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <AlertBanner
        tone="info"
        title="Important Rule: Online Games Never Reserve Physical Courts"
        body="Singles games seat 2 players; Doubles games seat 2–4 players. Forming a game online coordinates your playing partners only—courts are allocated on arrival at the floor."
      />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-[var(--navy-900)]">Upcoming Open Badminton Games</h2>
          <Link href="/portal/games" className="text-sm font-semibold text-[var(--stadium-blue)] hover:underline">
            Manage in Portal →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {openGames.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No open badminton games right now.</p>
          ) : (
            openGames.map((game) => (
              <div key={game.id} className="rounded-xl border border-[var(--border)] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--navy-900)]">
                    {game.gameType} · {formatDay(game.date)} ({game.period.toLowerCase()})
                  </span>
                  <StatusPill status={game.status} />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Organizer: {game.organizer.name} · {game.participants.length}/{game.maxPlayers} confirmed
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
