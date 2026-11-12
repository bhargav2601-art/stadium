import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { FindPlayersClient } from "@/components/portal/FindPlayersClient";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Find Players" };

export default async function FindPlayersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/find-players");

  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
  });
  const blockedIds = blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId));

  const players = await prisma.user.findMany({
    where: {
      id: { notIn: [user.id, ...blockedIds] },
      blocked: false,
      membership: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      playerProfile: {
        select: {
          skillLevel: true,
          preferredGame: true,
          preferredTime: true,
          playStyle: true,
          availableNow: true,
          intro: true,
        },
      },
      availability: {
        where: { date: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
        orderBy: { date: "asc" },
        take: 4,
      },
    },
    orderBy: [{ playerProfile: { availableNow: "desc" } }, { name: "asc" }],
    take: 50,
  });

  return (
    <PortalShell
      section="member"
      title="Find Badminton & TT Partners"
      subtitle="Connect with active stadium members by skill level, schedule, and play style."
    >
      <FindPlayersClient
        initialPlayers={players.map((p) => ({
          ...p,
          availability: p.availability.map((a) => ({
            id: a.id,
            date: a.date.toISOString(),
            period: a.period,
            sport: a.sport,
            note: a.note,
          })),
        }))}
      />
    </PortalShell>
  );
}
