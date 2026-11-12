import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { IssuesClient } from "@/components/staff/IssuesClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Facility Issues" };

export default async function StaffIssuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/staff/issues");
  if (!can(user.role, "issues.report")) redirect("/portal");

  const issues = await prisma.facilityReport.findMany({
    include: {
      facility: { select: { name: true, kind: true } },
      reportedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <PortalShell
      section="staff"
      title="Facility Issues & Maintenance"
      subtitle="Review member-reported issues, acknowledge repairs, and mark resolved."
    >
      <IssuesClient
        issues={issues.map((item) => ({
          id: item.id,
          facilityName: item.facility.name,
          facilityKind: item.facility.kind,
          description: item.description,
          status: item.status,
          reportedByName: item.reportedBy.name,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </PortalShell>
  );
}
