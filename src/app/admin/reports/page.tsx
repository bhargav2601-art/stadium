import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { ReportsAdminClient } from "@/components/admin/ReportsAdminClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Reports & Announcements" };

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/reports");
  if (!can(user.role, "reports.view")) redirect("/portal");

  const [memberReports, facilityIssues] = await Promise.all([
    prisma.memberReport.findMany({
      include: {
        reporter: { select: { name: true } },
        reported: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.facilityReport.findMany({
      include: {
        facility: { select: { name: true } },
        reportedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <PortalShell
      section="admin"
      title="Reports, Moderation & Announcements"
      subtitle="Send stadium-wide in-app notices, review conduct reports, and resolve facility issues."
    >
      <ReportsAdminClient
        memberReports={memberReports.map((r) => ({
          id: r.id,
          reason: r.reason,
          status: r.status,
          reporterName: r.reporter.name,
          reportedName: r.reported.name,
          createdAt: r.createdAt.toISOString(),
        }))}
        facilityIssues={facilityIssues.map((f) => ({
          id: f.id,
          facilityName: f.facility.name,
          description: f.description,
          status: f.status,
          reportedByName: f.reportedBy.name,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </PortalShell>
  );
}
