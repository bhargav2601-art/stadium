"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatDay, formatWhen } from "@/lib/format";

export type GameRoomDetail = {
  id: string;
  sport: string;
  gameType: string;
  date: string;
  period: string;
  startTime: string | null;
  skillLevel: string | null;
  playStyle: string | null;
  maxPlayers: number;
  joinMode: string;
  status: string;
  description: string | null;
  organizerId: string;
  organizer: { id: string; name: string };
  participants: Array<{
    id: string;
    userId: string;
    status: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      playerProfile: { skillLevel: string | null; playStyle: string | null; noShowCount: number } | null;
    };
  }>;
  waitlist: Array<{
    id: string;
    userId: string;
    position: number;
    status: string;
    offerExpiresAt: string | null;
    user: { id: string; name: string };
  }>;
  attendance: Array<{
    id: string;
    userId: string;
    status: string;
    markedAt: string;
  }>;
};

export function GameDetailClient({
  currentUserId,
  isStaffOrAdmin,
  playable,
  game,
}: {
  currentUserId: string;
  isStaffOrAdmin: boolean;
  playable: boolean;
  game: GameRoomDetail;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmed = game.participants.filter((p) => p.status === "CONFIRMED");
  const requested = game.participants.filter((p) => p.status === "REQUESTED");
  const myPart = game.participants.find(
    (p) => p.userId === currentUserId && (p.status === "CONFIRMED" || p.status === "REQUESTED"),
  );
  const activeWaitlist = game.waitlist.filter((w) => w.status === "WAITING" || w.status === "OFFERED");
  const myWait = activeWaitlist.find((w) => w.userId === currentUserId);

  const isOrganizer = game.organizerId === currentUserId;
  const canManageRoom = isOrganizer || isStaffOrAdmin;
  const isTerminal = ["COMPLETED", "INCOMPLETE", "CANCELLED"].includes(game.status);

  const initialAttendance = Object.fromEntries(
    confirmed.map((p) => {
      const existing = game.attendance.find((a) => a.userId === p.userId);
      return [p.userId, existing?.status === "ABSENT" ? "ABSENT" : "PRESENT"] as const;
    }),
  ) as Record<string, "PRESENT" | "ABSENT">;

  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, "PRESENT" | "ABSENT">>(
    initialAttendance,
  );

  async function apiCall(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: object,
    successText = "Updated game room.",
  ) {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Action failed." });
        return;
      }
      setFeedback({
        tone: "success",
        text: data.status === "REQUESTED" ? "Join request submitted." : successText,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/portal/games" className="text-sm font-semibold text-[var(--stadium-blue)] hover:underline">
          ← Back to all games
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="navy">{game.sport.replace("_", " ")}</Badge>
          <Badge tone="blue">{game.gameType}</Badge>
          <Badge tone="slate">{game.joinMode}</Badge>
          <StatusPill status={game.status} />
        </div>
      </div>

      <AlertBanner
        tone="info"
        title="Matchmaking Coordination Room"
        body="This room coordinates player attendance only. Physical courts at Anil Kumble Stadium remain first-come-first-served and are never reserved online."
      />

      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-xl font-bold text-[var(--navy-900)]">
              {formatDay(game.date)} · {game.period}
              {game.startTime ? ` (${game.startTime} IST)` : ""}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Organizer: <span className="font-semibold text-[var(--ink)]">{game.organizer.name}</span> · Capacity{" "}
              {confirmed.length}/{game.maxPlayers} players
              {game.skillLevel ? ` · ${game.skillLevel}` : ""}
              {game.playStyle ? ` · ${game.playStyle}` : ""}
            </p>
            {game.description ? <p className="mt-2 text-sm text-slate-700">{game.description}</p> : null}
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Confirmed Roster ({confirmed.length}/{game.maxPlayers})
            </h3>
            <div className="mt-3 space-y-2">
              {confirmed.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-slate-50 px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--navy-900)]">
                      {p.user.name}{" "}
                      {p.userId === game.organizerId ? (
                        <span className="ml-1 text-xs font-bold text-[var(--stadium-blue)]">(Organizer)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {p.user.playerProfile?.skillLevel ?? "Unrated"} ·{" "}
                      {p.user.playerProfile?.playStyle ?? "Flexible"} · No-shows:{" "}
                      {p.user.playerProfile?.noShowCount ?? 0}
                    </p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))}
              {Array.from({ length: Math.max(0, game.maxPlayers - confirmed.length) }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-xs font-medium text-slate-500"
                >
                  Open Slot #{confirmed.length + idx + 1}
                </div>
              ))}
            </div>
          </div>

          {canManageRoom && requested.length > 0 ? (
            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800">
                Pending Join Requests ({requested.length})
              </h3>
              <div className="mt-3 space-y-2">
                {requested.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--navy-900)]">{req.user.name}</p>
                      <p className="text-xs text-slate-600">Requested {formatWhen(req.joinedAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          apiCall(
                            `/api/games/${game.id}/requests/${req.id}`,
                            "POST",
                            { decision: "APPROVE" },
                            `${req.user.name} approved.`,
                          )
                        }
                        className="min-h-[36px] rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          apiCall(
                            `/api/games/${game.id}/requests/${req.id}`,
                            "POST",
                            { decision: "DECLINE" },
                            `${req.user.name} declined.`,
                          )
                        }
                        className="min-h-[36px] rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Waitlist Queue ({activeWaitlist.length})
            </h3>
            {activeWaitlist.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--muted)]">No players currently on waitlist.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {activeWaitlist.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[var(--navy-900)]">#{w.position}</span>{" "}
                      <span className="font-semibold">{w.user.name}</span>
                      {w.offerExpiresAt ? (
                        <span className="ml-2 text-amber-800">Offer until {formatWhen(w.offerExpiresAt)}</span>
                      ) : null}
                    </div>
                    <StatusPill status={w.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-base font-bold text-[var(--navy-900)]">Your Participation</h3>

            {myWait?.status === "OFFERED" ? (
              <div className="space-y-2 rounded-xl border border-[#bef264] bg-[#f7fee7] p-3">
                <p className="text-xs font-bold text-[#365314]">
                  A spot opened for you! Confirm before{" "}
                  {myWait.offerExpiresAt ? formatWhen(myWait.offerExpiresAt) : "expiry"}.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      apiCall(
                        `/api/games/${game.id}/waitlist/respond`,
                        "POST",
                        { decision: "ACCEPT" },
                        "Spot confirmed!",
                      )
                    }
                    className="min-h-[38px] flex-1 rounded-lg bg-[#0b1f3a] px-3 text-xs font-semibold text-white hover:bg-[#164e9b]"
                  >
                    Accept Spot
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      apiCall(
                        `/api/games/${game.id}/waitlist/respond`,
                        "POST",
                        { decision: "DECLINE" },
                        "Offer declined.",
                      )
                    }
                    className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : null}

            {!isTerminal && !myPart && !myWait ? (
              playable ? (
                game.status === "FULL" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => apiCall(`/api/games/${game.id}/waitlist`, "POST", {}, "Joined waitlist.")}
                    className="min-h-[44px] w-full rounded-xl bg-[var(--stadium-blue)] px-4 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
                  >
                    Join Waitlist
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => apiCall(`/api/games/${game.id}/join`, "POST", {}, "Joined game roster!")}
                    className="min-h-[44px] w-full rounded-xl bg-[var(--stadium-blue)] px-4 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
                  >
                    {game.joinMode === "APPROVAL" ? "Request to Join" : "Join Game"}
                  </button>
                )
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  Active membership required to join or waitlist.
                </p>
              )
            ) : null}

            {!isTerminal && myPart && !isOrganizer ? (
              <div className="space-y-2">
                {myPart.status === "CONFIRMED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      apiCall(
                        `/api/games/${game.id}/leave`,
                        "POST",
                        { needsReplacement: true },
                        "Marked spot for replacement & left game.",
                      )
                    }
                    className="min-h-[42px] w-full rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Leave & Find Replacement
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    apiCall(
                      `/api/games/${game.id}/leave`,
                      "POST",
                      { needsReplacement: false },
                      "Participation cancelled.",
                    )
                  }
                  className="min-h-[42px] w-full rounded-xl border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Cancel Participation
                </button>
              </div>
            ) : null}
          </Card>

          {canManageRoom ? (
            <Card className="space-y-3">
              <h3 className="text-base font-bold text-[var(--navy-900)]">Room Lifecycle</h3>
              <div className="grid gap-2">
                {!isTerminal && game.status !== "IN_PROGRESS" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      apiCall(`/api/games/${game.id}`, "PATCH", { action: "START" }, "Game marked In Progress.")
                    }
                    className="min-h-[40px] rounded-xl bg-[var(--navy-900)] px-3 text-xs font-semibold text-white hover:bg-[var(--stadium-blue)]"
                  >
                    Start Match (In Progress)
                  </button>
                ) : null}

                {!isTerminal ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        apiCall(
                          `/api/games/${game.id}`,
                          "PATCH",
                          { action: "OPEN_REPLACEMENT" },
                          "Game opened for replacement.",
                        )
                      }
                      className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Need Replacement Player
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        apiCall(`/api/games/${game.id}`, "PATCH", { action: "COMPLETE" }, "Game marked Completed.")
                      }
                      className="min-h-[40px] rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Mark Completed
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        apiCall(
                          `/api/games/${game.id}`,
                          "PATCH",
                          { action: "INCOMPLETE" },
                          "Game marked Incomplete.",
                        )
                      }
                      className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Mark Incomplete
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        apiCall(`/api/games/${game.id}`, "DELETE", undefined, "Game cancelled.")
                      }
                      className="min-h-[40px] rounded-xl border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                    >
                      Cancel Game
                    </button>
                  </>
                ) : null}
              </div>
            </Card>
          ) : null}

          {canManageRoom && confirmed.length > 0 && game.status !== "CANCELLED" ? (
            <Card className="space-y-3">
              <h3 className="text-base font-bold text-[var(--navy-900)]">Attendance & No-Shows</h3>
              <p className="text-xs text-[var(--muted)]">
                Marking a player Absent increments their no-show count and flags repeat no-shows for management review.
              </p>
              <div className="space-y-2">
                {confirmed.map((p) => {
                  const status = attendanceDraft[p.userId] ?? "PRESENT";
                  return (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-[var(--navy-900)]">{p.user.name}</span>
                      <select
                        aria-label={`Attendance for ${p.user.name}`}
                        value={status}
                        onChange={(e) =>
                          setAttendanceDraft((prev) => ({
                            ...prev,
                            [p.userId]: e.target.value as "PRESENT" | "ABSENT",
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
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  apiCall(
                    `/api/games/${game.id}/attendance`,
                    "POST",
                    {
                      marks: confirmed.map((p) => ({
                        userId: p.userId,
                        status: attendanceDraft[p.userId] ?? "PRESENT",
                      })),
                    },
                    "Attendance saved.",
                  )
                }
                className="min-h-[42px] w-full rounded-xl bg-[var(--navy-900)] px-4 text-xs font-semibold text-white hover:bg-[var(--stadium-blue)]"
              >
                Save Attendance
              </button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
