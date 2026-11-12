"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type FacilityItem = {
  id: string;
  kind: string;
  name: string;
  closed: boolean;
  closedReason: string | null;
  crowdLevel: string | null;
  courts: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    statusNote: string | null;
    statusUpdatedAt: string;
    stale: boolean;
  }>;
  queue: Array<{ id: string; userId: string; note: string | null; user: { id: string; name: string } }>;
};

type YogaItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  notes: string | null;
  registeredCount: number;
  isRegistered: boolean;
};

export function FacilitiesClient({
  currentUserId,
  facilities,
  yogaSessions,
  basketballInterestCount,
  basketballInterested,
  activeBasketball,
}: {
  currentUserId: string;
  facilities: FacilityItem[];
  yogaSessions: YogaItem[];
  basketballInterestCount: number;
  basketballInterested: boolean;
  activeBasketball: { startsAt: string; endsAt: string; notes: string | null } | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [issueFacility, setIssueFacility] = useState("BADMINTON");
  const [issueDesc, setIssueDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleQueue(kind: string, inQueue: boolean) {
    setFeedback(null);
    const res = await fetch(`/api/facilities/${kind}/queue`, {
      method: inQueue ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback({ tone: "error", text: data.error || "Could not update queue." });
      return;
    }
    setFeedback({ tone: "success", text: inQueue ? "Removed from queue." : "Joined walk-in queue." });
    router.refresh();
  }

  async function toggleYoga(sessionId: string, registered: boolean) {
    setFeedback(null);
    const res = await fetch(`/api/yoga/${sessionId}/register`, {
      method: registered ? "DELETE" : "POST",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback({ tone: "error", text: data.error || "Could not update yoga registration." });
      return;
    }
    setFeedback({ tone: "success", text: registered ? "Yoga spot cancelled." : "Registered for morning yoga!" });
    router.refresh();
  }

  async function toggleBasketball() {
    setFeedback(null);
    const res = await fetch("/api/basketball/interest", {
      method: basketballInterested ? "DELETE" : "POST",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback({ tone: "error", text: data.error || "Could not update basketball interest." });
      return;
    }
    setFeedback({
      tone: "success",
      text: basketballInterested
        ? "Basketball interest removed."
        : "Basketball interest registered! Management reviews requests around 10–15 players.",
    });
    router.refresh();
  }

  async function submitIssue(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/facilities/${issueFacility}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: issueDesc }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not submit report." });
        return;
      }
      setIssueDesc("");
      setFeedback({ tone: "success", text: "Issue reported to stadium floor staff." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? <AlertBanner tone={feedback.tone} title={feedback.text} /> : null}
      {activeBasketball ? (
        <AlertBanner
          tone="warning"
          title="Basketball Shared-Floor Mode Active"
          body={`All four badminton courts are temporarily disabled (${formatWhen(activeBasketball.startsAt)} – ${formatWhen(activeBasketball.endsAt)}).`}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {facilities
          .filter((f) => f.courts.length > 0)
          .map((facility) => {
            const inQueue = facility.queue.some((q) => q.userId === currentUserId);
            return (
              <Card key={facility.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[var(--navy-900)]">{facility.name}</h2>
                    <p className="text-xs text-[var(--muted)]">
                      Walk-in queue: {facility.queue.length} waiting · First-come-first-served
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleQueue(facility.kind, inQueue)}
                    className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold ${
                      inQueue
                        ? "border border-rose-200 bg-rose-50 text-rose-700"
                        : "bg-[var(--stadium-blue)] text-white"
                    }`}
                  >
                    {inQueue ? "Leave Queue" : "Join Walk-In Queue"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {facility.courts.map((c) => (
                    <div key={c.id} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-[var(--navy-900)]">{c.name}</span>
                        <StatusPill status={c.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{c.statusNote || "No floor note"}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {c.stale ? "Needs staff refresh" : formatWhen(c.statusUpdatedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--navy-900)]">Morning Yoga Sessions</h2>
            <Badge tone="lime">Morning Only</Badge>
          </div>
          {yogaSessions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No upcoming yoga sessions scheduled.</p>
          ) : (
            <div className="space-y-3">
              {yogaSessions.map((y) => (
                <div key={y.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3.5">
                  <div>
                    <p className="text-sm font-bold text-[var(--navy-900)]">{y.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatWhen(y.startsAt)} · {y.registeredCount}
                      {y.capacity ? `/${y.capacity}` : ""} registered
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleYoga(y.id, y.isRegistered)}
                    className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-bold ${
                      y.isRegistered
                        ? "border border-rose-200 bg-rose-50 text-rose-700"
                        : "bg-[var(--navy-900)] text-white"
                    }`}
                  >
                    {y.isRegistered ? "Cancel Spot" : "Register"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--navy-900)]">Basketball Shared-Floor Interest</h2>
            <p className="text-sm text-[var(--muted)]">
              Current interested players: <strong>{basketballInterestCount}</strong> (target ~10–15). Management decides
              if and when to schedule a shared-floor session.
            </p>
            <button
              type="button"
              onClick={toggleBasketball}
              className={`min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold ${
                basketballInterested
                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                  : "bg-[var(--lime)] text-[var(--lime-ink)]"
              }`}
            >
              {basketballInterested ? "Withdraw Basketball Interest" : "Register Basketball Interest"}
            </button>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-[var(--navy-900)]">Report a Facility Issue</h2>
            <form onSubmit={submitIssue} className="mt-3 space-y-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="issue-fac" className="text-xs font-semibold">Facility</label>
                <select id="issue-fac" value={issueFacility} onChange={(e) => setIssueFacility(e.target.value)}>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.kind}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="issue-desc" className="text-xs font-semibold">Issue details</label>
                <textarea
                  id="issue-desc"
                  rows={2}
                  required
                  minLength={5}
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="Net tension, lighting flicker, water cooler, floor mark..."
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="min-h-[42px] rounded-xl bg-[var(--navy-900)] px-4 py-2 text-xs font-bold text-white"
              >
                {busy ? "Sending..." : "Submit Issue to Staff"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
