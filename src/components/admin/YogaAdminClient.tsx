"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Card } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type YogaRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  notes: string | null;
  registeredCount: number;
};

export function YogaAdminClient({
  defaultDate,
  sessions,
}: {
  defaultDate: string;
  sessions: YogaRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("Morning Mobility & Core Yoga");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [capacity, setCapacity] = useState("25");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const startsAt = `${date}T${startTime}:00+05:30`;
      const endsAt = `${date}T${endTime}:00+05:30`;
      const res = await fetch("/api/yoga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startsAt,
          endsAt,
          capacity: capacity.trim() ? Number(capacity) : null,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not schedule morning yoga." });
        return;
      }
      setNotes("");
      setFeedback({ tone: "success", text: "Morning yoga session scheduled." });
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
        tone="info"
        title="Morning-Only Policy Enforced Server-Side"
        body="Yoga sessions must fall strictly between 05:00 and 12:00 IST. Afternoon or evening times are rejected automatically."
      />

      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Schedule Morning Yoga Session</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor="yoga-title" className="block text-xs font-semibold text-slate-700">
              Session Title
            </label>
            <input
              id="yoga-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="yoga-cap" className="block text-xs font-semibold text-slate-700">
              Capacity (optional)
            </label>
            <input
              id="yoga-cap"
              type="number"
              min={1}
              max={200}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="yoga-date" className="block text-xs font-semibold text-slate-700">
              Date
            </label>
            <input
              id="yoga-date"
              type="date"
              required
              min={defaultDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="yoga-start" className="block text-xs font-semibold text-slate-700">
              Start Time (Morning IST)
            </label>
            <input
              id="yoga-start"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="yoga-end" className="block text-xs font-semibold text-slate-700">
              End Time (Morning IST)
            </label>
            <input
              id="yoga-end"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="yoga-notes" className="block text-xs font-semibold text-slate-700">
              Notes
            </label>
            <input
              id="yoga-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bring personal yoga mat..."
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="min-h-[42px] w-full rounded-xl bg-[var(--stadium-blue)] px-4 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
            >
              {busy ? "Scheduling..." : "Publish Morning Session"}
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--navy-900)]">{s.title}</h3>
              <p className="text-xs text-[var(--muted)]">
                {formatWhen(s.startsAt)} → {formatWhen(s.endsAt)}
                {s.notes ? ` · ${s.notes}` : ""}
              </p>
            </div>
            <p className="text-sm font-bold text-[var(--navy-900)]">
              {s.registeredCount}
              {s.capacity ? ` / ${s.capacity}` : ""} registered
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
