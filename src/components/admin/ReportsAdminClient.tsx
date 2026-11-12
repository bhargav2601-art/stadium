"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type MemberReportRow = {
  id: string;
  reason: string;
  status: string;
  reporterName: string;
  reportedName: string;
  createdAt: string;
};

type FacilityIssueRow = {
  id: string;
  facilityName: string;
  description: string;
  status: string;
  reportedByName: string;
  createdAt: string;
};

export function ReportsAdminClient({
  memberReports,
  facilityIssues,
}: {
  memberReports: MemberReportRow[];
  facilityIssues: FacilityIssueRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function sendAnnouncement(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, audience }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Failed to send announcement." });
        return;
      }
      setTitle("");
      setBody("");
      setFeedback({ tone: "success", text: "In-app stadium announcement delivered." });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  async function updateModeration(id: string, status: "REVIEWED" | "DISMISSED") {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setFeedback({ tone: "success", text: `Member report marked ${status}.` });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateIssue(id: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setFeedback({ tone: "success", text: `Facility issue marked ${status}.` });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Broadcast Stadium Announcement</h2>
        <form onSubmit={sendAnnouncement} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
            <select
              aria-label="Audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as "ACTIVE" | "ALL")}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active Members Only</option>
              <option value="ALL">All Registered Accounts</option>
            </select>
          </div>
          <textarea
            rows={2}
            required
            minLength={5}
            maxLength={500}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notice body..."
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-[40px] rounded-xl bg-[var(--stadium-blue)] px-5 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
          >
            {busy ? "Sending..." : "Send In-App Announcement"}
          </button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Member Conduct Reports</h2>
          {memberReports.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No conduct reports filed.</p>
          ) : (
            memberReports.map((r) => (
              <div key={r.id} className="space-y-2 rounded-xl border border-[var(--border)] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--navy-900)]">
                    {r.reportedName} (reported by {r.reporterName})
                  </span>
                  <StatusPill status={r.status} />
                </div>
                <p className="text-slate-700">{r.reason}</p>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{formatWhen(r.createdAt)}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateModeration(r.id, "REVIEWED")}
                      className="rounded border border-[var(--border)] px-2 py-1 font-semibold text-[var(--navy-900)]"
                    >
                      Reviewed
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateModeration(r.id, "DISMISSED")}
                      className="rounded border border-[var(--border)] px-2 py-1 font-semibold text-slate-600"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Facility Issue Reports</h2>
          {facilityIssues.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No facility issues filed.</p>
          ) : (
            facilityIssues.map((f) => (
              <div key={f.id} className="space-y-2 rounded-xl border border-[var(--border)] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="navy">{f.facilityName}</Badge>
                  <StatusPill status={f.status} />
                </div>
                <p className="text-slate-700">{f.description}</p>
                <div className="flex items-center justify-between text-slate-500">
                  <span>
                    {f.reportedByName} · {formatWhen(f.createdAt)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateIssue(f.id, "ACKNOWLEDGED")}
                      className="rounded border border-[var(--border)] px-2 py-1 font-semibold text-[var(--navy-900)]"
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateIssue(f.id, "RESOLVED")}
                      className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-semibold text-emerald-800"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
