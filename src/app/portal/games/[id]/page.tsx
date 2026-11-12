import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { GameDetailClient } from "@/components/portal/GameDetailClient";
import { canUseFacilities } from "@/domain/membership";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Game Room" };

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/portal/games/${id}`);

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true } },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              playerProfile: { select: { skillLevel: true, playStyle: true, noShowCount: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      waitlist: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { position: "asc" },
      },
      attendance: true,
    },
  });

  if (!game) notFound();

  const playable = canUseFacilities(user.membership?.status ?? "PENDING");
  const isStaffOrAdmin = can(user.role, "courts.update");

  return (
    <PortalShell
      section="member"
      title={`${game.sport.replace("_", " ")} · ${game.gameType}`}
      subtitle="Manage roster slots, replacement requests, waitlist offers, and attendance."
    >
      <GameDetailClient
        currentUserId={user.id}
        isStaffOrAdmin={isStaffOrAdmin}
        playable={playable}
        game={{
          id: game.id,
          sport: game.sport,
          gameType: game.gameType,
          date: game.date.toISOString(),
          period: game.period,
          startTime: game.startTime,
          skillLevel: game.skillLevel,
          playStyle: game.playStyle,
          maxPlayers: game.maxPlayers,
          joinMode: game.joinMode,
          status: game.status,
          description: game.description,
          organizerId: game.organizerId,
          organizer: game.organizer,
          participants: game.participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            status: p.status,
            joinedAt: p.joinedAt.toISOString(),
            user: p.user,
          })),
          waitlist: game.waitlist.map((w) => ({
            id: w.id,
            userId: w.userId,
            position: w.position,
            status: w.status,
            offerExpiresAt: w.offerExpiresAt ? w.offerExpiresAt.toISOString() : null,
            user: w.user,
          })),
          attendance: game.attendance.map((a) => ({
            id: a.id,
            userId: a.userId,
            status: a.status,
            markedAt: a.markedAt.toISOString(),
          })),
        }}
      />
    </PortalShell>
  );
}
