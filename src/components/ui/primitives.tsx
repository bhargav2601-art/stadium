import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "navy" | "blue" | "lime" | "green" | "amber" | "red" | "slate";

const TONE_CLASSES: Record<Tone, string> = {
  navy: "bg-[var(--navy-900)] text-white border-[var(--navy-800)]",
  blue: "bg-blue-50 text-[#164e9b] border-blue-200",
  lime: "bg-[#ecfccb] text-[#365314] border-[#bef264]",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-900 border-amber-200",
  red: "bg-rose-50 text-rose-800 border-rose-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
    case "OPEN":
    case "CONFIRMED":
    case "PAID":
    case "RESOLVED":
    case "PRESENT":
    case "PROMOTED":
      return "green";
    case "EXPIRING_SOON":
    case "TRANSITION":
    case "WAITING_FOR_REPLACEMENT":
    case "PENDING_VERIFICATION":
    case "REQUESTED":
    case "OFFERED":
    case "ACKNOWLEDGED":
      return "amber";
    case "BASKETBALL":
    case "IN_PROGRESS":
    case "FULL":
      return "blue";
    case "OCCUPIED":
    case "SUSPENDED":
    case "EXPIRED":
    case "MAINTENANCE":
    case "CANCELLED":
    case "REJECTED":
    case "FAILED":
    case "ABSENT":
    case "NO_SHOW":
      return "red";
    default:
      return "slate";
  }
}

export function StatusPill({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_2px_12px_rgba(11,31,58,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-[#bef264] bg-[#0b1f3a] text-white"
          : "border-[var(--border)] bg-white text-[var(--ink)]"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-[#a3e635]" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {hint ? (
        <p className={`mt-1 text-xs ${accent ? "text-slate-300" : "text-slate-600"}`}>{hint}</p>
      ) : null}
    </div>
  );
}

export function AlertBanner({
  tone = "info",
  title,
  body,
}: {
  tone?: "info" | "warning" | "error" | "success";
  title: string;
  body?: string;
}) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-rose-200 bg-rose-50 text-rose-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      <p className="font-semibold">{title}</p>
      {body ? <p className="mt-0.5 opacity-90">{body}</p> : null}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--stadium-blue)]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-bold text-[var(--navy-900)] sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy-900)] transition hover:border-[var(--stadium-blue)] hover:text-[var(--stadium-blue)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
      <h3 className="text-lg font-bold text-[var(--navy-900)]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--stadium-blue-hover)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
