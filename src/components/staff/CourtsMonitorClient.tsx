"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type CourtRow = {
  id: string;
  code: string;
  name: string;
  facilityKind: string;
  facilityName: string;
  status: string;
  statusNote: string | null;
  statusUpdatedAt: string;
  stale: boolean;
  history: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
};

const COURT_STATUSES = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "TRANSITION", "BASKETBALL"] as const;

export function CourtsMonitorClient({ courts }: { courts: CourtRow[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(courts.map((c) => [c.id, c.statusNote ?? ""])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function updateStatus(courtId: string, status: (typeof COURT_STATUSES)[number]) {
    setFeedback(null);
    setBusyId(courtId);
    try {
      const note = notes[courtId]?.trim() || null;
      const res = await fetch(`/api/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not update court status." });
        return;
      }
      setFeedback({ tone: "success", text: `Updated status to ${status}.` });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {courts.map((court) => (
          <Card key={court.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="navy">{court.code}</Badge>
                  <h2 className="text-lg font-bold text-[var(--navy-900)]">{court.name}</h2>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {court.facilityName} · Updated {formatWhen(court.statusUpdatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {court.stale ? <Badge tone="amber">Stale (&gt;30m)</Badge> : null}
                <StatusPill status={court.status} />
              </div>
            </div>

            <div>
              <label htmlFor={`note-${court.id}`} className="block text-xs font-semibold text-slate-700">
                Desk Note (optional)
              </label>
              <input
                id={`note-${court.id}`}
                type="text"
                maxLength={200}
                value={notes[court.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [court.id]: e.target.value }))}
                placeholder="e.g., Floor sweep complete / Shuttle replacement"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {COURT_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busyId === court.id}
                  onClick={() => updateStatus(court.id, status)}
                  className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition ${
                    court.status === status
                      ? "bg-[var(--navy-900)] text-white"
                      : "border border-[var(--border)] bg-slate-50 text-slate-800 hover:border-[var(--stadium-blue)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {court.history.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Changes</p>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {court.history.map((h) => (
                    <li key={h.id}>
                      <span className="font-semibold text-[var(--navy-900)]">{h.status}</span> ·{" "}
                      {formatWhen(h.createdAt)}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
