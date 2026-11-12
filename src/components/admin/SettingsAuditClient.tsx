"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type SettingEntry = { key: string; value: string; description: string | null };
type AuditRow = {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
};

export function SettingsAuditClient({
  canEditCritical,
  settings,
  auditLogs,
}: {
  canEditCritical: boolean;
  settings: SettingEntry[];
  auditLogs: AuditRow[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: values }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not update settings." });
        return;
      }
      setFeedback({ tone: "success", text: "Application settings and pricing saved." });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!canEditCritical ? (
        <AlertBanner
          tone="warning"
          title="Read-Only Settings View"
          body="Critical pricing and threshold settings can only be modified by the Super Administrator."
        />
      ) : null}

      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Stadium Configuration & Pricing</h2>
        <form onSubmit={saveSettings} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {settings.map((s) => (
              <div key={s.key} className="rounded-xl border border-[var(--border)] p-3">
                <label htmlFor={`set-${s.key}`} className="block text-xs font-bold text-[var(--navy-900)]">
                  {s.key}
                </label>
                {s.description ? <p className="mt-0.5 text-xs text-[var(--muted)]">{s.description}</p> : null}
                <input
                  id={`set-${s.key}`}
                  type="text"
                  disabled={!canEditCritical}
                  value={values[s.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm disabled:bg-slate-100"
                />
              </div>
            ))}
          </div>

          {canEditCritical ? (
            <button
              type="submit"
              disabled={busy}
              className="min-h-[42px] rounded-xl bg-[var(--navy-900)] px-5 text-sm font-semibold text-white hover:bg-[var(--stadium-blue)]"
            >
              {busy ? "Saving..." : "Save Configuration"}
            </button>
          ) : null}
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Audit Log Trail</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No audit log events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] uppercase text-slate-500">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 pr-3 text-slate-500">{formatWhen(log.createdAt)}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[var(--navy-900)]">{log.actorName}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone="blue">{log.action}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {log.entity} ({log.entityId})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
