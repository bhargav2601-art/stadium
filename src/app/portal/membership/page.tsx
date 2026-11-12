import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { MembershipClient } from "@/components/portal/MembershipClient";
import { prisma } from "@/lib/db";
import { requireUser } from "@/server/guards";
import { purposeFor } from "@/server/membership";
import { isRazorpayConfigured } from "@/server/payments";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Membership & Payments" };

export default async function PortalMembershipPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login?next=/portal/membership");

  const [payments, settings] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  const nextPurpose = purposeFor(user.membership?.startedAt ?? null);
  const nextAmountPaise = Number(
    nextPurpose === "INITIAL" ? settings["membership.initial_paise"] : settings["membership.monthly_paise"],
  );

  return (
    <PortalShell
      section="member"
      title="Membership & Payments"
      subtitle="Activate your ₹5,000 initial membership or renew monthly (₹1,000) with zero court or per-game surcharges."
    >
      <MembershipClient
        membershipStatus={user.membership?.status ?? "PENDING"}
        startedAt={user.membership?.startedAt?.toISOString() ?? null}
        expiresAt={user.membership?.expiresAt?.toISOString() ?? null}
        nextAmountPaise={nextAmountPaise}
        nextPurpose={nextPurpose}
        razorpayEnabled={isRazorpayConfigured()}
        userEmail={user.email}
        userName={user.name}
        payments={payments.map((p) => ({
          id: p.id,
          purpose: p.purpose,
          method: p.method,
          amountPaise: p.amountPaise,
          status: p.status,
          provider: p.provider,
          offlineReference: p.offlineReference,
          receiptNumber: p.receiptNumber,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </PortalShell>
  );
}
