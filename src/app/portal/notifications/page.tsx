import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { NotificationsClient } from "@/components/portal/NotificationsClient";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Notifications" };

export default async function PortalNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/notifications");

  const [notifications, preference] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <PortalShell
      section="member"
      title="Notifications"
      subtitle="Game invites, waitlist offers, payment confirmations, and stadium updates."
    >
      <NotificationsClient
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          href: n.href,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        }))}
        initialInApp={preference?.inApp ?? true}
        initialMuted={preference?.mutedTypes ?? []}
      />
    </PortalShell>
  );
}
