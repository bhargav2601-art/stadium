"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatDay } from "@/lib/format";

type AttendanceGame = {
  id: string;
  sport: string;
  gameType: string;
  date: string;
  period: string;
  startTime: string | null;
  status: string;
  organizerName: string;
  participants: Array<{ userId: string; name: string }>;
  existingMarks: Record<string, "PRESENT" | "ABSENT">;
};

export function AttendanceDeskClient({ games }: { games: AttendanceGame[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Record<string, "PRESENT" | "ABSENT">>>(
    Object.fromEntries(
      games.map((g) => [
        g.id,
        Object.fromEntries(
          g.participants.map((p) => [p.userId, g.existingMarks[p.userId] ?? "PRESENT"]),
        ),
      ]),
    ),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function saveAttendance(game: AttendanceGame) {
    setFeedback(null);
    setBusyId(game.id);
    try {
      const marks = game.participants.map((p) => ({
        userId: p.userId,
        status: drafts[game.id]?.[p.userId] ?? "PRESENT",
      }));
      const res = await fetch(`/api/games/${game.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not save attendance." });
        return;
      }
      setFeedback({ tone: "success", text: `Saved attendance for ${formatDay(game.date)} ${game.period}.` });
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

      <div className="grid gap-4">
        {games.map((game) => (
          <Card key={game.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="navy">{game.sport.replace("_", " ")}</Badge>
                <Badge tone="blue">{game.gameType}</Badge>
                <span className="text-sm font-bold text-[var(--navy-900)]">
                  {formatDay(game.date)} · {game.period}
                  {game.startTime ? ` · ${game.startTime}` : ""}
                </span>
                <span className="text-xs text-[var(--muted)]">Organizer: {game.organizerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={game.status} />
                <Link
                  href={`/portal/games/${game.id}`}
                  className="text-xs font-semibold text-[var(--stadium-blue)] hover:underline"
                >
                  Open Room →
                </Link>
              </div>
            </div>

            {game.participants.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No confirmed players in this match.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {game.participants.map((p) => {
                  const val = drafts[game.id]?.[p.userId] ?? "PRESENT";
                  return (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-[var(--navy-900)]">{p.name}</span>
                      <select
                        aria-label={`Attendance for ${p.name}`}
                        value={val}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [game.id]: {
                              ...(prev[game.id] ?? {}),
                              [p.userId]: e.target.value as "PRESENT" | "ABSENT",
                            },
                          }))
                        }
                        className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 font-semibold"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent (No-Show)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {game.participants.length > 0 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busyId === game.id}
                  onClick={() => saveAttendance(game)}
                  className="min-h-[38px] rounded-xl bg-[var(--navy-900)] px-4 text-xs font-semibold text-white hover:bg-[var(--stadium-blue)]"
                >
                  {busyId === game.id ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
