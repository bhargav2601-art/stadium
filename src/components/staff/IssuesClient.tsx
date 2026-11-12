"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type IssueRow = {
  id: string;
  facilityName: string;
  facilityKind: string;
  description: string;
  status: string;
  reportedByName: string;
  createdAt: string;
};

export function IssuesClient({ issues }: { issues: IssueRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [kind, setKind] = useState("BADMINTON");
  const [description, setDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visible = filter === "ALL" ? issues : issues.filter((i) => i.status === filter);

  async function updateStatus(id: string, status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED") {
    setFeedback(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/staff/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not update issue status." });
        return;
      }
      setFeedback({ tone: "success", text: `Issue marked ${status}.` });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusyId(null);
    }
  }

  async function createIssue(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/facilities/${kind}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not log report." });
        return;
      }
      setDescription("");
      setFeedback({ tone: "success", text: "Facility issue logged." });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Log Staff Facility Issue</h2>
        <form onSubmit={createIssue} className="grid gap-3 md:grid-cols-4">
          <select
            aria-label="Facility"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            <option value="BADMINTON">Badminton</option>
            <option value="GYM">Gym</option>
            <option value="TABLE_TENNIS">Table Tennis</option>
            <option value="YOGA">Morning Yoga</option>
            <option value="BASKETBALL">Basketball Shared Floor</option>
          </select>
          <input
            type="text"
            required
            minLength={5}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe net tension, lighting, damp spot, or equipment repair..."
            className="md:col-span-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[42px] rounded-xl bg-[var(--stadium-blue)] px-4 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
          >
            {submitting ? "Logging..." : "Log Issue"}
          </button>
        </form>
      </Card>

      <div className="flex flex-wrap gap-2">
        {["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`min-h-[38px] rounded-xl px-3.5 text-xs font-semibold ${
              filter === tab
                ? "bg-[var(--navy-900)] text-white"
                : "border border-[var(--border)] bg-white text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((item) => (
          <Card key={item.id} className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="navy">{item.facilityName}</Badge>
                <StatusPill status={item.status} />
                <span className="text-xs text-[var(--muted)]">
                  By {item.reportedByName} · {formatWhen(item.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-800">{item.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const).map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={busyId === item.id || item.status === next}
                  onClick={() => updateStatus(item.id, next)}
                  className="min-h-[36px] rounded-lg border border-[var(--border)] bg-slate-50 px-3 text-xs font-semibold text-[var(--navy-900)] disabled:opacity-40 hover:border-[var(--stadium-blue)]"
                >
                  {next}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
