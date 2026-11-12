"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string };

const MEMBER_NAV: NavItem[] = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/games", label: "Games & Matchmaking" },
  { href: "/portal/find-players", label: "Find Players" },
  { href: "/portal/availability", label: "My Availability" },
  { href: "/portal/facilities", label: "Live Facilities" },
  { href: "/portal/membership", label: "Membership" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/profile", label: "Profile" },
];

const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "Staff Overview" },
  { href: "/staff/courts", label: "Courts & Tables" },
  { href: "/staff/checkins", label: "Check-In Desk" },
  { href: "/staff/attendance", label: "Game Attendance" },
  { href: "/staff/issues", label: "Facility Issues" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/facilities", label: "Courts & Facilities" },
  { href: "/admin/yoga", label: "Yoga" },
  { href: "/admin/basketball", label: "Basketball" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings & Audit" },
];

export function PortalShell({
  section,
  title,
  subtitle,
  children,
}: {
  section: "member" | "staff" | "admin";
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const items = section === "admin" ? ADMIN_NAV : section === "staff" ? STAFF_NAV : MEMBER_NAV;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[var(--navy-900)] to-[var(--stadium-blue)] p-6 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-[#a3e635]">
          {section === "admin"
            ? "Management Control"
            : section === "staff"
              ? "Stadium Floor Operations"
              : "Member Workspace"}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-200">{subtitle}</p> : null}

        <nav aria-label={`${section} navigation`} className="mt-5 flex flex-wrap gap-2">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/portal" &&
                item.href !== "/staff" &&
                item.href !== "/admin" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-[38px] items-center rounded-xl px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "bg-[var(--lime)] text-[var(--lime-ink)]"
                    : "bg-white/10 text-slate-100 hover:bg-white/20"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="animate-rise space-y-6">{children}</div>
    </div>
  );
}
