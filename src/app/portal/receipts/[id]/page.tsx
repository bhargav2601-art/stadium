import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, StatusPill } from "@/components/ui/primitives";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { formatInr, formatWhen } from "@/lib/format";
import { getCurrentUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Payment Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [payment, settings] = await Promise.all([
    prisma.payment.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } }, membership: true },
    }),
    getSettings(),
  ]);

  if (!payment) notFound();
  if (payment.userId !== user.id && !can(user.role, "payments.verify")) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card className="space-y-6 p-8">
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--stadium-blue)]">
              Official Membership Receipt
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--navy-900)]">{settings["stadium.name"]}</h1>
          </div>
          <StatusPill status={payment.status} />
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Receipt Number</dt>
            <dd className="font-bold text-[var(--navy-900)]">{payment.receiptNumber ?? "Pending"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Issued At</dt>
            <dd className="font-medium">{formatWhen(payment.verifiedAt ?? payment.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Member</dt>
            <dd className="font-medium">{payment.user.name} ({payment.user.email})</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Payment Method</dt>
            <dd className="font-medium">{payment.method} ({payment.provider})</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Purpose</dt>
            <dd className="font-medium">{payment.purpose === "INITIAL" ? "Initial Membership" : "Monthly Renewal"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Amount Paid</dt>
            <dd className="text-xl font-bold text-[var(--stadium-blue)]">{formatInr(payment.amountPaise)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
          <Link
            href="/portal/membership"
            className="inline-flex min-h-[42px] items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--navy-900)]"
          >
            ← Back to Membership
          </Link>
        </div>
      </Card>
    </div>
  );
}
