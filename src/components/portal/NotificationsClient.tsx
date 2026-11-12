"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBanner, Badge, Card } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const MUTE_OPTIONS = [
  "GAME_REMINDER",
  "PLAYER_JOINED",
  "WAITLIST_OFFER",
  "YOGA_ANNOUNCEMENT",
  "STADIUM_ANNOUNCEMENT",
  "MESSAGE",
];

export function NotificationsClient({
  notifications,
  initialInApp,
  initialMuted,
}: {
  notifications: NotificationItem[];
  initialInApp: boolean;
  initialMuted: string[];
}) {
  const router = useRouter();
  const [inApp, setInApp] = useState(initialInApp);
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [status, setStatus] = useState<string | null>(null);

  async function markRead(id?: string, all?: boolean) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all }),
    });
    router.refresh();
  }

  async function savePreferences() {
    setStatus(null);
    const res = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inApp, mutedTypes: muted }),
    });
    if (res.ok) {
      setStatus("Notification preferences updated.");
      router.refresh();
    }
  }

  function toggleMuted(type: string) {
    setMuted((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--navy-900)]">In-App Notifications</h2>
          <button
            type="button"
            onClick={() => markRead(undefined, true)}
            className="min-h-[38px] rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
          >
            Mark all read
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Your notification inbox is empty.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border p-4 ${
                  n.readAt ? "border-[var(--border)] bg-white" : "border-blue-200 bg-blue-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={n.readAt ? "slate" : "blue"}>{n.type.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-slate-500">{formatWhen(n.createdAt)}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-[var(--navy-900)]">{n.title}</h3>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{n.body}</p>
                  </div>
                  {!n.readAt ? (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="shrink-0 text-xs font-semibold text-[var(--stadium-blue)] hover:underline"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
                {n.href ? (
                  <Link href={n.href} className="mt-2 inline-block text-xs font-semibold text-[var(--stadium-blue)] hover:underline">
                    Open related page →
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Preferences</h2>
        {status ? <AlertBanner tone="success" title={status} /> : null}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(e) => setInApp(e.target.checked)}
            className="h-4 w-4 accent-[var(--stadium-blue)]"
          />
          Enable in-app notifications
        </label>
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-bold uppercase text-slate-500">Mute Specific Categories</p>
          {MUTE_OPTIONS.map((type) => (
            <label key={type} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={muted.includes(type)}
                onChange={() => toggleMuted(type)}
                className="h-4 w-4 accent-[var(--stadium-blue)]"
              />
              {type.replace(/_/g, " ")}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={savePreferences}
          className="min-h-[42px] w-full rounded-xl bg-[var(--navy-900)] px-4 py-2 text-sm font-semibold text-white"
        >
          Save Preferences
        </button>
      </Card>
    </div>
  );
}
