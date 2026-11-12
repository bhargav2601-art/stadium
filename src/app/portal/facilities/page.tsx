import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { FacilitiesClient } from "@/components/portal/FacilitiesClient";
import { isStatusStale } from "@/domain/staleness";
import { prisma } from "@/lib/db";
import { getFacilitiesSnapshot } from "@/server/facilities";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Live Facilities" };

export default async function PortalFacilitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/facilities");

  const [snapshot, myInterest] = await Promise.all([
    getFacilitiesSnapshot(),
    prisma.basketballInterest.findUnique({ where: { userId: user.id } }),
  ]);
  const now = new Date();

  return (
    <PortalShell
      section="member"
      title="Live Facilities & Floor Pulse"
      subtitle="Check live court and table availability, join walk-in queues, register for morning yoga, or report issues."
    >
      <FacilitiesClient
        currentUserId={user.id}
        facilities={snapshot.facilities.map((f) => ({
          id: f.id,
          kind: f.kind,
          name: f.name,
          closed: f.closed,
          closedReason: f.closedReason,
          crowdLevel: f.crowdLevel,
          courts: f.courts.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            status: c.status,
            statusNote: c.statusNote,
            statusUpdatedAt: c.statusUpdatedAt.toISOString(),
            stale: isStatusStale(c.statusUpdatedAt, now, snapshot.staleMinutes),
          })),
          queue: f.queue,
        }))}
        yogaSessions={snapshot.upcomingYoga.map((y) => ({
          id: y.id,
          title: y.title,
          startsAt: y.startsAt.toISOString(),
          endsAt: y.endsAt.toISOString(),
          capacity: y.capacity,
          notes: y.notes,
          registeredCount: y.registrations.length,
          isRegistered: y.registrations.some((r) => r.userId === user.id),
        }))}
        basketballInterestCount={snapshot.basketballInterestCount}
        basketballInterested={Boolean(myInterest)}
        activeBasketball={
          snapshot.activeBasketball
            ? {
                startsAt: snapshot.activeBasketball.startsAt.toISOString(),
                endsAt: snapshot.activeBasketball.endsAt.toISOString(),
                notes: snapshot.activeBasketball.notes,
              }
            : null
        }
      />
    </PortalShell>
  );
}
