"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { AlertBanner, Badge, Card } from "@/components/ui/primitives";
import { formatDay } from "@/lib/format";

type PlayerCard = {
  id: string;
  name: string;
  avatarUrl: string | null;
  playerProfile: {
    skillLevel: string;
    preferredGame: string | null;
    preferredTime: string;
    playStyle: string;
    availableNow: boolean;
    intro: string | null;
  } | null;
  availability: Array<{ id: string; date: string; period: string; sport: string; note: string | null }>;
};

export function FindPlayersClient({ initialPlayers }: { initialPlayers: PlayerCard[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [skill, setSkill] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [playStyle, setPlayStyle] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [reportTarget, setReportTarget] = useState<PlayerCard | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function applyFilters() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (skill) params.set("skillLevel", skill);
      if (preferredTime) params.set("preferredTime", preferredTime);
      if (playStyle) params.set("playStyle", playStyle);
      if (availableOnly) params.set("availableNow", "true");
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/players?${params.toString()}`);
      const data = (await res.json()) as { players?: PlayerCard[] };
      if (res.ok && data.players) setPlayers(data.players);
    } finally {
      setLoading(false);
    }
  }

  async function blockUser(targetUserId: string) {
    await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BLOCK", targetUserId }),
    });
    setPlayers((prev) => prev.filter((p) => p.id !== targetUserId));
    setFeedback("Member blocked. You will no longer receive messages from them.");
    router.refresh();
  }

  async function submitReport() {
    if (!reportTarget) return;
    const res = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REPORT", targetUserId: reportTarget.id, reason: reportReason }),
    });
    if (res.ok) {
      setReportTarget(null);
      setReportReason("");
      setFeedback("Report submitted to stadium administrators.");
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? <AlertBanner tone="info" title={feedback} /> : null}

      <Card>
        <search>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="flex flex-col gap-1 lg:col-span-2">
              <label htmlFor="fp-q" className="text-xs font-semibold">Search name</label>
              <input id="fp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players..." />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-skill" className="text-xs font-semibold">Skill</label>
              <select id="fp-skill" value={skill} onChange={(e) => setSkill(e.target.value)}>
                <option value="">All levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-time" className="text-xs font-semibold">Time</label>
              <select id="fp-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                <option value="">Any time</option>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-style" className="text-xs font-semibold">Style</label>
              <select id="fp-style" value={playStyle} onChange={(e) => setPlayStyle(e.target.value)}>
                <option value="">All styles</option>
                <option value="CASUAL">Casual</option>
                <option value="COMPETITIVE">Competitive</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="h-4 w-4 accent-[var(--stadium-blue)]"
                />
                Available now
              </label>
              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className="min-h-[42px] rounded-xl bg-[var(--stadium-blue)] px-4 py-2 text-xs font-bold text-white"
              >
                {loading ? "Filtering..." : "Filter Players"}
              </button>
            </div>
          </div>
        </search>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {players.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <p className="text-sm text-[var(--muted)]">No matching active players found.</p>
          </Card>
        ) : (
          players.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--navy-900)]">{p.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {p.playerProfile?.availableNow ? <Badge tone="lime">Available Now</Badge> : null}
                      <Badge tone="blue">{p.playerProfile?.skillLevel ?? "BEGINNER"}</Badge>
                      <Badge tone="slate">{p.playerProfile?.playStyle ?? "CASUAL"}</Badge>
                    </div>
                  </div>
                </div>
                {p.playerProfile?.intro ? (
                  <p className="mt-2.5 text-sm text-[var(--muted)]">{p.playerProfile.intro}</p>
                ) : null}
                {p.availability.length > 0 ? (
                  <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-2.5">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Upcoming Availability</p>
                    {p.availability.map((a) => (
                      <p key={a.id} className="text-xs text-slate-700">
                        {formatDay(a.date)} ({a.period}) · {a.sport.replace("_", " ")}
                        {a.note ? ` — ${a.note}` : ""}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                <Link
                  href={`/portal/messages?with=${p.id}`}
                  className="inline-flex min-h-[38px] items-center rounded-xl bg-[var(--navy-900)] px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Message
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => blockUser(p.id)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTarget(p)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Report
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <ModalDialog
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        title={`Report ${reportTarget?.name ?? "Member"}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Share details with stadium administrators so they can review conduct or safety concerns.
          </p>
          <textarea
            rows={4}
            required
            minLength={5}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe what happened..."
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportTarget(null)}
              className="min-h-[40px] rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReport}
              disabled={reportReason.trim().length < 5}
              className="min-h-[40px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Submit Report
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
