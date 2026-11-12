"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Shield, Trophy, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type HeaderUser = {
  id: string;
  name: string;
  role: string;
  membershipStatus: string;
} | null;

const PUBLIC_LINKS = [
  { href: "/facilities", label: "Facilities" },
  { href: "/facilities/badminton", label: "Badminton" },
  { href: "/membership", label: "Membership" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  stadiumName,
  user,
  unreadNotifications,
}: {
  stadiumName: string;
  user: HeaderUser;
  unreadNotifications: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setDrawerOpen(false);
    router.push("/");
    router.refresh();
  }

  const isStaff = user && ["STAFF", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"].includes(user.role);
  const isAdmin = user && ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"].includes(user.role);

  return (
    <header className="sticky top-0 z-40 border-b border-[#1b365d] bg-[var(--navy-900)] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-white no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lime)] text-[var(--lime-ink)] shadow-sm">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight sm:text-lg">{stadiumName}</span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#a3e635]">
              Community Sports Arena
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_LINKS.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white/15 text-[#a3e635]" : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link
                href="/portal/notifications"
                aria-label={`Notifications (${unreadNotifications} unread)`}
                className="relative inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--lime)] px-1 text-[11px] font-bold text-[var(--lime-ink)]">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/portal"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[var(--lime)] px-3.5 py-2 text-sm font-bold text-[var(--lime-ink)] transition hover:brightness-95"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Member Portal
              </Link>
              {isStaff ? (
                <Link
                  href="/staff"
                  className="inline-flex min-h-[40px] items-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Staff
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[#a3e635]/40 bg-[#164e9b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1e60b8]"
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-[40px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-[40px] items-center rounded-xl bg-[var(--lime)] px-4 py-2 text-sm font-bold text-[var(--lime-ink)] transition hover:brightness-95"
              >
                Join Stadium
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <dialog
        id="mobile-nav-drawer"
        ref={drawerRef}
        aria-label="Mobile navigation"
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === drawerRef.current) setDrawerOpen(false);
        }}
        className="ml-auto mr-0 mt-0 mb-0 h-[100dvh] max-h-none w-80 max-w-[85vw] rounded-none border-l border-[#1b365d] bg-[var(--navy-900)] p-5 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="font-bold text-[#a3e635]">{stadiumName}</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Mobile menu" className="mt-4 flex flex-col gap-1">
          {PUBLIC_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl px-3 py-3 text-base font-medium text-slate-100 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
          <hr className="my-3 border-white/10" />
          {user ? (
            <>
              <Link
                href="/portal"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl bg-[var(--lime)] px-3 py-3 text-center text-base font-bold text-[var(--lime-ink)]"
              >
                Member Portal
              </Link>
              <Link
                href="/portal/games"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-slate-100 hover:bg-white/10"
              >
                Matchmaking & Games
              </Link>
              <Link
                href="/portal/notifications"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-slate-100 hover:bg-white/10"
              >
                Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
              </Link>
              {isStaff ? (
                <Link
                  href="/staff"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-slate-100 hover:bg-white/10"
                >
                  Staff Desk
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-[#a3e635] hover:bg-white/10"
                >
                  Admin Console
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 rounded-xl border border-white/20 px-3 py-3 text-left text-base font-medium text-slate-200 hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl bg-[var(--lime)] px-4 py-3 text-center font-bold text-[var(--lime-ink)]"
              >
                Join Stadium
              </Link>
            </div>
          )}
        </nav>
      </dialog>
    </header>
  );
}
