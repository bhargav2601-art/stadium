import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { BasketballAdminClient } from "@/components/admin/BasketballAdminClient";
import { can } from "@/domain/permissions";
import { kolkataParts } from "@/domain/time";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Basketball Floor Conversion" };

export default async function AdminBasketballPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/basketball");
  if (!can(user.role, "basketball.schedule")) redirect("/portal");

  const { date: defaultDate } = kolkataParts();
  const [interests, sessions] = await Promise.all([
    prisma.basketballInterest.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.basketballSession.findMany({
      orderBy: { startsAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <PortalShell
      section="admin"
      title="Basketball Shared-Floor Conversion"
      subtitle="Review member interest (10–15 target) and manually approve shared-floor basketball sessions."
    >
      <BasketballAdminClient
        defaultDate={defaultDate}
        interests={interests.map((item) => ({
          id: item.id,
          userName: item.user.name,
          userEmail: item.user.email,
          note: item.note,
          createdAt: item.createdAt.toISOString(),
        }))}
        sessions={sessions.map((s) => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          notes: s.notes,
          published: s.published,
          endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        }))}
      />
    </PortalShell>
  );
}
