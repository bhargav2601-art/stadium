import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { GamesClient } from "@/components/portal/GamesClient";
import { canUseFacilities } from "@/domain/membership";
import { kolkataParts } from "@/domain/time";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Games & Matchmaking" };

export default async function GamesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/games");

  const membershipStatus = user.membership?.status ?? "PENDING";
  const playable = canUseFacilities(membershipStatus);
  const { date: defaultDate } = kolkataParts();

  const games = await prisma.game.findMany({
    include: {
      organizer: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      waitlist: {
        where: { status: { in: ["WAITING", "OFFERED"] } },
        orderBy: { position: "asc" },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 80,
  });

  return (
    <PortalShell
      section="member"
      title="Games & Matchmaking"
      subtitle="Create Singles or Doubles rooms, fill open slots, join waitlists, and coordinate on-court sessions."
    >
      <GamesClient
        currentUserId={user.id}
        playable={playable}
        membershipStatus={membershipStatus}
        defaultDate={defaultDate}
        games={games.map((g) => ({
          id: g.id,
          sport: g.sport,
          gameType: g.gameType,
          date: g.date.toISOString(),
          period: g.period,
          startTime: g.startTime,
          skillLevel: g.skillLevel,
          playStyle: g.playStyle,
          maxPlayers: g.maxPlayers,
          joinMode: g.joinMode,
          status: g.status,
          description: g.description,
          organizerId: g.organizerId,
          organizer: g.organizer,
          participants: g.participants,
          waitlist: g.waitlist.map((w) => ({
            id: w.id,
            userId: w.userId,
            position: w.position,
            status: w.status,
            offerExpiresAt: w.offerExpiresAt ? w.offerExpiresAt.toISOString() : null,
          })),
        }))}
      />
    </PortalShell>
  );
}
