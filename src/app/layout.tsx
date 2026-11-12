import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Anil Kumble Stadium | Community Sports & Matchmaking",
    template: "%s | Anil Kumble Stadium",
  },
  description:
    "Play Together. Stay Active. Belong to a Community. Indoor badminton matchmaking, live court visibility, conditioning gym, table tennis, morning yoga, and shared-floor basketball.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, settings] = await Promise.all([
    getCurrentUser().catch(() => null),
    getSettings().catch(() => null),
  ]);

  const unreadNotifications = user
    ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }).catch(() => 0)
    : 0;

  return (
    <html lang="en">
      <body className="bg-[var(--surface)] text-[var(--ink)] antialiased">
        <a href="#main-content" className="skip-link visually-hidden">
          Skip to main content
        </a>
        <SiteHeader
          stadiumName={settings?.["stadium.name"] ?? "Anil Kumble Stadium"}
          user={
            user
              ? {
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  membershipStatus: user.membership?.status ?? "PENDING",
                }
              : null
          }
          unreadNotifications={unreadNotifications}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter
          stadiumName={settings?.["stadium.name"] ?? "Anil Kumble Stadium"}
          tagline={settings?.["stadium.tagline"] ?? "Play Together. Stay Active. Belong to a Community."}
          address={settings?.["stadium.address"] ?? "Not set — add the stadium address in system settings"}
          phone={settings?.["stadium.phone"] ?? "Not set — add the stadium phone in system settings"}
          email={settings?.["stadium.email"] ?? "Not set — add the stadium email in system settings"}
          hoursNote={
            settings?.["stadium.hours_note"] ??
            "Provisional hours. Confirm with stadium management before relying on them."
          }
        />
      </body>
    </html>
  );
}
