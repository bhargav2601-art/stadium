import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { AvailabilityClient } from "@/components/portal/AvailabilityClient";
import { kolkataParts } from "@/domain/time";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "My Availability" };

export default async function PortalAvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/availability");

  const slots = await prisma.playerAvailability.findMany({
    where: { userId: user.id },
    orderBy: [{ date: "asc" }, { period: "asc" }],
  });

  return (
    <PortalShell
      section="member"
      title="My Playing Availability"
      subtitle="Let other active members see when you are free for badminton or table tennis."
    >
      <AvailabilityClient
        defaultDate={kolkataParts(new Date()).date}
        slots={slots.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          period: s.period,
          sport: s.sport,
          note: s.note,
        }))}
      />
    </PortalShell>
  );
}
