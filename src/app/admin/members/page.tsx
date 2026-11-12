import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { MembersClient } from "@/components/admin/MembersClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Members & Roles" };

export default async function AdminMembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/members");
  if (!can(user.role, "members.manage")) redirect("/portal");

  const members = await prisma.user.findMany({
    include: {
      membership: { select: { status: true, expiresAt: true } },
      playerProfile: { select: { noShowCount: true, flaggedForReview: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <PortalShell
      section="admin"
      title="Members, Roles & Suspensions"
      subtitle="Manage member validity, review no-show flags, assign staff roles, and block abusive accounts."
    >
      <MembersClient
        currentUserId={user.id}
        canAssignAdminRoles={can(user.role, "admins.manage")}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          role: m.role,
          blocked: m.blocked,
          membershipStatus: m.membership?.status ?? "PENDING",
          expiresAt: m.membership?.expiresAt ? m.membership.expiresAt.toISOString() : null,
          noShowCount: m.playerProfile?.noShowCount ?? 0,
          flaggedForReview: m.playerProfile?.flaggedForReview ?? false,
        }))}
      />
    </PortalShell>
  );
}
