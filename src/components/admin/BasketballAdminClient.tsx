"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type InterestRow = {
  id: string;
  userName: string;
  userEmail: string;
  note: string | null;
  createdAt: string;
};

type BasketballRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  published: boolean;
  endedAt: string | null;
};

export function BasketballAdminClient({
  defaultDate,
  interests,
  sessions,
}: {
  defaultDate: string;
  interests: InterestRow[];
  sessions: BasketballRow[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const [notes, setNotes] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function scheduleSession(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/basketball/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: `${date}T${startTime}:00+05:30`,
          endsAt: `${date}T${endTime}:00+05:30`,
          notes: notes.trim() || null,
          publish: publishNow,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not create basketball session." });
        return;
      }
      setNotes("");
      setFeedback({
        tone: "success",
        text: publishNow
          ? "Basketball session published & shared floor converted (all 4 badminton courts paused)."
          : "Draft basketball session created.",
      });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  async function runTransition(sessionId: string, action: "PUBLISH" | "END") {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/basketball/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not transition floor mode." });
        return;
      }
      setFeedback({
        tone: "success",
        text:
          action === "PUBLISH"
            ? "Floor converted to BASKETBALL mode (4 badminton courts disabled)."
            : "Badminton floor restored (4 courts AVAILABLE).",
      });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AlertBanner
        tone="warning"
        title="Manual Management Conversion Only"
        body={`Approximately 10–15 interested players are required before conversion. Basketball never switches automatically — publishing marks all 4 badminton courts as BASKETBALL and notifies active members. Current interest count: ${interests.length}.`}
      />

      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Schedule Basketball Conversion</h2>
          <form onSubmit={scheduleSession} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="bb-date" className="block text-xs font-semibold text-slate-700">
                  Date
                </label>
                <input
                  id="bb-date"
                  type="date"
                  required
                  min={defaultDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="bb-start" className="block text-xs font-semibold text-slate-700">
                  Start (IST)
                </label>
                <input
                  id="bb-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="bb-end" className="block text-xs font-semibold text-slate-700">
                  End (IST)
                </label>
                <input
                  id="bb-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bb-notes" className="block text-xs font-semibold text-slate-700">
                Conversion Notes
              </label>
              <input
                id="bb-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Full-court 5v5 run; nets stowed for 90 minutes."
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="h-4 w-4 accent-[var(--stadium-blue)]"
              />
              Publish & convert shared floor immediately (pauses all 4 badminton courts)
            </label>

            <button
              type="submit"
              disabled={busy}
              className="min-h-[42px] w-full rounded-xl bg-[var(--stadium-blue)] px-4 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
            >
              {busy ? "Processing..." : publishNow ? "Publish & Convert Floor" : "Create Draft Session"}
            </button>
          </form>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--navy-900)]">Player Interest Queue</h2>
            <Badge tone={interests.length >= 10 ? "lime" : "amber"}>{interests.length} / 10–15 target</Badge>
          </div>
          {interests.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No members registered interest yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
              {interests.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-[var(--navy-900)]">{item.userName}</p>
                    <p className="text-slate-500">
                      {item.userEmail}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </div>
                  <span className="text-slate-400">{formatWhen(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Scheduled & Active Basketball Sessions</h2>
        <div className="space-y-2.5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <StatusPill status={s.endedAt ? "COMPLETED" : s.published ? "BASKETBALL" : "PENDING"} />
                  <span className="text-sm font-bold text-[var(--navy-900)]">
                    {formatWhen(s.startsAt)} → {formatWhen(s.endsAt)}
                  </span>
                </div>
                {s.notes ? <p className="mt-1 text-xs text-slate-600">{s.notes}</p> : null}
              </div>

              <div className="flex gap-2">
                {!s.published && !s.endedAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runTransition(s.id, "PUBLISH")}
                    className="min-h-[36px] rounded-lg bg-[var(--stadium-blue)] px-3 text-xs font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
                  >
                    Publish & Convert Floor
                  </button>
                ) : null}
                {s.published && !s.endedAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runTransition(s.id, "END")}
                    className="min-h-[36px] rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    End & Restore Badminton Courts
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
