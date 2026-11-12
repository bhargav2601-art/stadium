import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AlertBanner, Badge, Card, SectionHeader } from "@/components/ui/primitives";
import { prisma } from "@/lib/db";
import { formatInr } from "@/lib/format";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Membership Plans" };

export default async function MembershipPage() {
  const [plans, settings] = await Promise.all([
    prisma.membershipPlan.findMany({ where: { active: true }, orderBy: { amountPaise: "desc" } }),
    getSettings(),
  ]);

  const initialPlan = plans.find((p) => p.code === "INITIAL");
  const renewalPlan = plans.find((p) => p.code === "MONTHLY_RENEWAL");
  const initialAmount = initialPlan?.amountPaise ?? Number(settings["membership.initial_paise"]);
  const renewalAmount = renewalPlan?.amountPaise ?? Number(settings["membership.monthly_paise"]);
  const periodDays = initialPlan?.intervalDays ?? Number(settings["membership.period_days"]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="Membership"
        title="Simple, all-inclusive stadium membership"
        subtitle="Zero hourly charges, zero per-game surcharges, and full access across all stadium facilities subject to validity and operating hours."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-[var(--navy-900)] p-6">
          <Badge tone="navy">New Members</Badge>
          <h2 className="mt-3 text-2xl font-bold text-[var(--navy-900)]">Initial Membership</h2>
          <p className="mt-2 text-4xl font-bold text-[var(--stadium-blue)]">{formatInr(initialAmount)}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Covers your first {periodDays}-day membership cycle</p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Badminton (4 FCFS courts + online matchmaking)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Gym floor & 2 Table Tennis tables
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Morning yoga registration & basketball interest
            </li>
          </ul>
          <Link
            href="/register"
            className="mt-6 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[var(--navy-900)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--navy-800)]"
          >
            Register & Get Started
          </Link>
        </Card>

        <Card className="border-2 border-[#bef264] bg-[#fcfff5] p-6">
          <Badge tone="lime">Existing Members</Badge>
          <h2 className="mt-3 text-2xl font-bold text-[var(--navy-900)]">Monthly Renewal</h2>
          <p className="mt-2 text-4xl font-bold text-[var(--navy-900)]">{formatInr(renewalAmount)}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Extends membership validity by {periodDays} days</p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Pay online (Razorpay / sandbox) or submit offline UPI reference
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Instant receipt & automatic expiry extension
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Uninterrupted matchmaking & waitlist access
            </li>
          </ul>
          <Link
            href="/portal/membership"
            className="mt-6 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[var(--lime)] px-5 py-3 text-sm font-bold text-[var(--lime-ink)] hover:brightness-95"
          >
            Renew in Member Portal
          </Link>
        </Card>
      </div>

      <AlertBanner
        tone="info"
        title="No Court Reservation or Per-Game Fees"
        body="Badminton games created online coordinate players only. Physical courts operate first-come-first-served and never carry extra hourly fees."
      />
    </div>
  );
}
