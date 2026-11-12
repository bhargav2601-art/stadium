import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { YogaAdminClient } from "@/components/admin/YogaAdminClient";
import { can } from "@/domain/permissions";
import { kolkataParts } from "@/domain/time";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Morning Yoga Schedule" };

export default async function AdminYogaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/yoga");
  if (!can(user.role, "yoga.manage")) redirect("/portal");

  const { date: defaultDate } = kolkataParts();
  const sessions = await prisma.yogaSession.findMany({
    where: { cancelled: false },
    include: {
      registrations: { where: { cancelledAt: null }, select: { id: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 40,
  });

  return (
    <PortalShell
      section="admin"
      title="Morning Yoga Administration"
      subtitle="Schedule morning-only yoga sessions and monitor registration capacity."
    >
      <YogaAdminClient
        defaultDate={defaultDate}
        sessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          capacity: s.capacity,
          notes: s.notes,
          registeredCount: s.registrations.length,
        }))}
      />
    </PortalShell>
  );
}
