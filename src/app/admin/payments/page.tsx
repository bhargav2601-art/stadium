import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { PaymentsAdminClient } from "@/components/admin/PaymentsAdminClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Payment Verification" };

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/payments");
  if (!can(user.role, "payments.verify")) redirect("/portal");

  const payments = await prisma.payment.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <PortalShell
      section="admin"
      title="Payments & Offline Verification"
      subtitle="Verify offline stadium counter receipts and review Razorpay/sandbox transaction logs."
    >
      <PaymentsAdminClient
        payments={payments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          purpose: p.purpose,
          method: p.method,
          provider: p.provider,
          amountPaise: p.amountPaise,
          status: p.status,
          offlineReference: p.offlineReference,
          createdAt: p.createdAt.toISOString(),
          verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
          user: p.user,
        }))}
      />
    </PortalShell>
  );
}
