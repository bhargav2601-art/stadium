"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card } from "@/components/ui/primitives";
import { formatDay } from "@/lib/format";

type Slot = {
  id: string;
  date: string;
  period: "MORNING" | "EVENING";
  sport: "BADMINTON" | "TABLE_TENNIS";
  note: string | null;
};

export function AvailabilityClient({ slots, defaultDate }: { slots: Slot[]; defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [period, setPeriod] = useState<"MORNING" | "EVENING">("EVENING");
  const [sport, setSport] = useState<"BADMINTON" | "TABLE_TENNIS">("BADMINTON");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, period, sport, note: note || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not save availability." });
        return;
      }
      setNote("");
      setFeedback({ tone: "success", text: "Availability posted for fellow members." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    await fetch("/api/availability", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Post Playing Availability</h2>
        <form onSubmit={onAdd} className="mt-4 space-y-3">
          {feedback ? <AlertBanner tone={feedback.tone} title={feedback.text} /> : null}
          <div className="flex flex-col gap-1">
            <label htmlFor="avail-date" className="text-xs font-semibold">Date</label>
            <input id="avail-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="avail-period" className="text-xs font-semibold">Session</label>
            <select id="avail-period" value={period} onChange={(e) => setPeriod(e.target.value as never)}>
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="avail-sport" className="text-xs font-semibold">Sport</label>
            <select id="avail-sport" value={sport} onChange={(e) => setSport(e.target.value as never)}>
              <option value="BADMINTON">Badminton</option>
              <option value="TABLE_TENNIS">Table Tennis</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="avail-note" className="text-xs font-semibold">Note (optional)</label>
            <input
              id="avail-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Doubles around 18:30"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[44px] w-full rounded-xl bg-[var(--stadium-blue)] px-4 py-2 text-sm font-bold text-white"
          >
            {busy ? "Saving..." : "Save Availability"}
          </button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">My Posted Slots</h2>
        <div className="mt-4 space-y-3">
          {slots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">You haven&apos;t posted any upcoming availability slots yet.</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{slot.sport.replace("_", " ")}</Badge>
                    <span className="text-sm font-bold text-[var(--navy-900)]">
                      {formatDay(slot.date)} · {slot.period}
                    </span>
                  </div>
                  {slot.note ? <p className="mt-1 text-xs text-[var(--muted)]">{slot.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(slot.id)}
                  className="min-h-[36px] rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
