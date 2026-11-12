import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { CourtsMonitorClient } from "@/components/staff/CourtsMonitorClient";
import { can } from "@/domain/permissions";
import { isStatusStale } from "@/domain/staleness";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Courts & Tables Monitor" };

export default async function StaffCourtsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/staff/courts");
  if (!can(user.role, "courts.update")) redirect("/portal");

  const now = new Date();
  const [settings, courts] = await Promise.all([
    getSettings(),
    prisma.court.findMany({
      include: {
        facility: { select: { name: true, kind: true } },
        history: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: [{ facility: { kind: "asc" } }, { code: "asc" }],
    }),
  ]);
  const staleMinutes = Number(settings["facility.stale_minutes"]);

  return (
    <PortalShell
      section="staff"
      title="Official Courts & Tables Status"
      subtitle="Only authorized stadium staff update official court and table statuses. Matchmaking games never reserve physical courts."
    >
      <CourtsMonitorClient
        courts={courts.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          facilityKind: c.facility.kind,
          facilityName: c.facility.name,
          status: c.status,
          statusNote: c.statusNote,
          statusUpdatedAt: c.statusUpdatedAt.toISOString(),
          stale: isStatusStale(c.statusUpdatedAt, now, staleMinutes),
          history: c.history.map((h) => ({
            id: h.id,
            status: h.status,
            note: h.note,
            createdAt: h.createdAt.toISOString(),
          })),
        }))}
      />
    </PortalShell>
  );
}
