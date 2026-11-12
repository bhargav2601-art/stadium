import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { CheckInsClient } from "@/components/staff/CheckInsClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Check-In Desk" };

export default async function StaffCheckInsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/staff/checkins");
  if (!can(user.role, "checkin.verify")) redirect("/portal");

  const [members, courts, checkIns] = await Promise.all([
    prisma.user.findMany({
      include: { membership: { select: { status: true } } },
      orderBy: { name: "asc" },
      take: 150,
    }),
    prisma.court.findMany({
      include: { facility: { select: { kind: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.facilityCheckIn.findMany({
      include: {
        facility: { select: { name: true, kind: true } },
        user: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { name: true } },
      },
      orderBy: { checkedInAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <PortalShell
      section="staff"
      title="Front Desk Check-In Verification"
      subtitle="Verify active membership and log physical facility arrival and checkout."
    >
      <CheckInsClient
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          membershipStatus: m.membership?.status ?? "PENDING",
          blocked: m.blocked,
        }))}
        courts={courts.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          facilityKind: c.facility.kind,
        }))}
        checkIns={checkIns.map((row) => ({
          id: row.id,
          facilityName: row.facility.name,
          facilityKind: row.facility.kind,
          courtId: row.courtId,
          checkedInAt: row.checkedInAt.toISOString(),
          checkedOutAt: row.checkedOutAt ? row.checkedOutAt.toISOString() : null,
          user: row.user,
          verifiedBy: row.verifiedBy,
        }))}
      />
    </PortalShell>
  );
}
