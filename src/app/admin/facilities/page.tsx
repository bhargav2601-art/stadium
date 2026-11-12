import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { FacilitiesAdminClient } from "@/components/admin/FacilitiesAdminClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Facilities & Staff" };

export default async function AdminFacilitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/facilities");
  if (!can(user.role, "facilities.manage")) redirect("/portal");

  const [facilities, staffUsers, assignments] = await Promise.all([
    prisma.facility.findMany({ orderBy: { kind: "asc" } }),
    prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"] }, blocked: false },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffAssignment.findMany({
      include: {
        user: { select: { name: true } },
        facility: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PortalShell
      section="admin"
      title="Facilities & Staff Assignments"
      subtitle="Update facility operational status, maintenance closures, crowd levels, and staff assignments."
    >
      <FacilitiesAdminClient
        facilities={facilities.map((f) => ({
          id: f.id,
          kind: f.kind,
          name: f.name,
          closed: f.closed,
          closedReason: f.closedReason,
          crowdLevel: f.crowdLevel,
        }))}
        staffUsers={staffUsers}
        assignments={assignments.map((a) => ({
          id: a.id,
          userId: a.userId,
          facilityId: a.facilityId,
          userName: a.user.name,
          facilityName: a.facility.name,
        }))}
      />
    </PortalShell>
  );
}
