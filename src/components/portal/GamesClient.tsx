"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { AlertBanner, Badge, Card, EmptyState, StatusPill } from "@/components/ui/primitives";
import { formatDay } from "@/lib/format";

export type GameListItem = {
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
    user: { id: string; name: string };
  }>;
  waitlist: Array<{
    id: string;
    userId: string;
    position: number;
    status: string;
    offerExpiresAt: string | null;
  }>;
};

type TabKey = "open" | "mine" | "all" | "history";

const ACTIVE_GAME_STATUSES = new Set(["OPEN", "FULL", "IN_PROGRESS", "WAITING_FOR_REPLACEMENT"]);
const HISTORY_GAME_STATUSES = new Set(["COMPLETED", "INCOMPLETE", "CANCELLED"]);

export function GamesClient({
  currentUserId,
  playable,
  membershipStatus,
  defaultDate,
  games,
}: {
  currentUserId: string;
  playable: boolean;
  membershipStatus: string;
  defaultDate: string;
  games: GameListItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("open");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sport, setSport] = useState<"BADMINTON" | "TABLE_TENNIS">("BADMINTON");
  const [gameType, setGameType] = useState<"SINGLES" | "DOUBLES">("DOUBLES");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [date, setDate] = useState(defaultDate);
  const [period, setPeriod] = useState<"MORNING" | "EVENING">("EVENING");
  const [startTime, setStartTime] = useState("18:30");
  const [skillLevel, setSkillLevel] = useState<"" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED">("INTERMEDIATE");
  const [playStyle, setPlayStyle] = useState<"" | "CASUAL" | "COMPETITIVE">("CASUAL");
  const [joinMode, setJoinMode] = useState<"OPEN" | "APPROVAL">("OPEN");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (sportFilter !== "ALL" && g.sport !== sportFilter) return false;
      if (periodFilter !== "ALL" && g.period !== periodFilter) return false;

      const myPart = g.participants.find(
        (p) => p.userId === currentUserId && (p.status === "CONFIRMED" || p.status === "REQUESTED"),
      );
      const myWait = g.waitlist.find(
        (w) => w.userId === currentUserId && (w.status === "WAITING" || w.status === "OFFERED"),
      );
      const inGame = g.organizerId === currentUserId || Boolean(myPart) || Boolean(myWait);

      if (tab === "open") {
        return g.status === "OPEN" || g.status === "WAITING_FOR_REPLACEMENT";
      }
      if (tab === "mine") {
        return inGame && ACTIVE_GAME_STATUSES.has(g.status);
      }
      if (tab === "all") {
        return ACTIVE_GAME_STATUSES.has(g.status);
      }
      return HISTORY_GAME_STATUSES.has(g.status);
    });
  }, [games, tab, sportFilter, periodFilter, currentUserId]);

  function handleGameTypeChange(nextType: "SINGLES" | "DOUBLES") {
    setGameType(nextType);
    setMaxPlayers(nextType === "SINGLES" ? 2 : 4);
  }

  async function handleCreateGame(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setCreating(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          gameType,
          date,
          period,
          startTime: startTime.trim() ? startTime.trim() : null,
          skillLevel: skillLevel || null,
          playStyle: playStyle || null,
          maxPlayers: gameType === "SINGLES" ? 2 : maxPlayers,
          joinMode,
          description: description.trim() ? description.trim() : null,
        }),
      });
      const data = (await res.json()) as { error?: string; game?: { id: string } };
      if (!res.ok || !data.game) {
        setFeedback({ tone: "error", text: data.error || "Could not create game." });
        return;
      }
      setModalOpen(false);
      setDescription("");
      setFeedback({ tone: "success", text: "Game room created. Redirecting to room..." });
      router.push(`/portal/games/${data.game.id}`);
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error while creating game." });
    } finally {
      setCreating(false);
    }
  }

  async function runAction(gameId: string, url: string, body?: object, okText = "Updated.") {
    setFeedback(null);
    setBusyId(gameId);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Action could not be completed." });
        return;
      }
      setFeedback({
        tone: "success",
        text: data.status === "REQUESTED" ? "Join request sent to organizer." : okText,
      });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error while updating game." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AlertBanner
        tone="info"
        title="Coordination Only — First-Come-First-Served Courts"
        body="Matchmaking coordinates player groups for Badminton (4 courts) and Table Tennis (2 tables). Joining an online game does not reserve a physical court."
      />

      {!playable ? (
        <AlertBanner
          tone="warning"
          title={`Membership ${membershipStatus} — Read-Only View`}
          body="Activate or renew your membership in the Membership tab to create games, join matches, or enter waitlists."
        />
      ) : null}

      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Game views">
          {(
            [
              ["open", "Open & Replacements"],
              ["mine", "My Games"],
              ["all", "All Active"],
              ["history", "History"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                tab === key
                  ? "bg-[var(--navy-900)] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by sport"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="min-h-[40px] rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--navy-900)]"
          >
            <option value="ALL">All Sports</option>
            <option value="BADMINTON">Badminton</option>
            <option value="TABLE_TENNIS">Table Tennis</option>
          </select>

          <select
            aria-label="Filter by session period"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="min-h-[40px] rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--navy-900)]"
          >
            <option value="ALL">Morning & Evening</option>
            <option value="MORNING">Morning</option>
            <option value="EVENING">Evening</option>
          </select>

          <button
            type="button"
            disabled={!playable}
            onClick={() => setModalOpen(true)}
            className="min-h-[40px] rounded-xl bg-[var(--stadium-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--stadium-blue-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Create Game
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching games in this view"
          description="Try another filter tab, check Find Players for looking-to-play members, or create a new Singles or Doubles game."
          actionHref="/portal/find-players"
          actionLabel="Find Players"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((game) => {
            const confirmed = game.participants.filter((p) => p.status === "CONFIRMED");
            const myPart = game.participants.find(
              (p) => p.userId === currentUserId && (p.status === "CONFIRMED" || p.status === "REQUESTED"),
            );
            const myWait = game.waitlist.find(
              (w) => w.userId === currentUserId && (w.status === "WAITING" || w.status === "OFFERED"),
            );
            const spotsLeft = Math.max(0, game.maxPlayers - confirmed.length);
            const canJoin =
              playable &&
              !myPart &&
              !myWait &&
              (game.status === "OPEN" || game.status === "WAITING_FOR_REPLACEMENT");
            const canWaitlist = playable && !myPart && !myWait && game.status === "FULL";

            return (
              <Card key={game.id} className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="navy">{game.sport.replace("_", " ")}</Badge>
                      <Badge tone="blue">{game.gameType}</Badge>
                      <Badge tone="slate">{game.joinMode === "APPROVAL" ? "Approval" : "Open"}</Badge>
                    </div>
                    <StatusPill status={game.status} />
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-[var(--navy-900)]">
                    {formatDay(game.date)} · {game.period}
                    {game.startTime ? ` · ${game.startTime} IST` : ""}
                  </h3>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Organized by <span className="font-semibold text-[var(--ink)]">{game.organizer.name}</span>
                    {game.skillLevel ? ` · ${game.skillLevel}` : ""}
                    {game.playStyle ? ` · ${game.playStyle}` : ""}
                  </p>

                  {game.description ? (
                    <p className="mt-2 text-sm text-slate-700">{game.description}</p>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[var(--navy-900)]">
                      <span>
                        Confirmed Players ({confirmed.length}/{game.maxPlayers})
                      </span>
                      <span>{spotsLeft > 0 ? `${spotsLeft} slot(s) open` : `${game.waitlist.length} waiting`}</span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      {confirmed.map((p) => p.user.name).join(", ") || "None yet"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                  <div className="flex flex-wrap gap-2">
                    {myPart ? (
                      <Badge tone={myPart.status === "CONFIRMED" ? "green" : "amber"}>
                        You: {myPart.status}
                      </Badge>
                    ) : null}
                    {myWait ? (
                      <Badge tone={myWait.status === "OFFERED" ? "lime" : "slate"}>
                        Waitlist #{myWait.position} ({myWait.status})
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {myWait?.status === "OFFERED" ? (
                      <button
                        type="button"
                        disabled={busyId === game.id}
                        onClick={() =>
                          runAction(
                            game.id,
                            `/api/games/${game.id}/waitlist/respond`,
                            { decision: "ACCEPT" },
                            "Waitlist spot accepted!",
                          )
                        }
                        className="min-h-[38px] rounded-lg bg-[#a3e635] px-3 py-1.5 text-xs font-bold text-[#0b1f3a] hover:bg-[#bef264]"
                      >
                        Accept Spot
                      </button>
                    ) : null}

                    {canJoin ? (
                      <button
                        type="button"
                        disabled={busyId === game.id}
                        onClick={() =>
                          runAction(game.id, `/api/games/${game.id}/join`, {}, "Joined game roster!")
                        }
                        className="min-h-[38px] rounded-lg bg-[var(--stadium-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
                      >
                        {game.joinMode === "APPROVAL" ? "Request Slot" : "Join Game"}
                      </button>
                    ) : null}

                    {canWaitlist ? (
                      <button
                        type="button"
                        disabled={busyId === game.id}
                        onClick={() =>
                          runAction(game.id, `/api/games/${game.id}/waitlist`, {}, "Added to waitlist.")
                        }
                        className="min-h-[38px] rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--navy-900)] hover:border-[var(--stadium-blue)]"
                      >
                        Join Waitlist
                      </button>
                    ) : null}

                    <Link
                      href={`/portal/games/${game.id}`}
                      className="inline-flex min-h-[38px] items-center rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[var(--navy-900)] hover:bg-slate-100"
                    >
                      Open Room →
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ModalDialog open={modalOpen} onClose={() => setModalOpen(false)} title="Create Matchmaking Game">
        <form onSubmit={handleCreateGame} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="game-sport" className="block text-xs font-semibold text-[var(--navy-900)]">
                Sport
              </label>
              <select
                id="game-sport"
                value={sport}
                onChange={(e) => setSport(e.target.value as "BADMINTON" | "TABLE_TENNIS")}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                <option value="BADMINTON">Badminton</option>
                <option value="TABLE_TENNIS">Table Tennis</option>
              </select>
            </div>
            <div>
              <label htmlFor="game-type" className="block text-xs font-semibold text-[var(--navy-900)]">
                Format
              </label>
              <select
                id="game-type"
                value={gameType}
                onChange={(e) => handleGameTypeChange(e.target.value as "SINGLES" | "DOUBLES")}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                <option value="SINGLES">Singles (max 2 players)</option>
                <option value="DOUBLES">Doubles (2–4 players)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="game-date" className="block text-xs font-semibold text-[var(--navy-900)]">
                Date
              </label>
              <input
                id="game-date"
                type="date"
                required
                min={defaultDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="game-period" className="block text-xs font-semibold text-[var(--navy-900)]">
                Session
              </label>
              <select
                id="game-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as "MORNING" | "EVENING")}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
              </select>
            </div>
            <div>
              <label htmlFor="game-start" className="block text-xs font-semibold text-[var(--navy-900)]">
                Start Time (IST)
              </label>
              <input
                id="game-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="game-join-mode" className="block text-xs font-semibold text-[var(--navy-900)]">
                Join Mode
              </label>
              <select
                id="game-join-mode"
                value={joinMode}
                onChange={(e) => setJoinMode(e.target.value as "OPEN" | "APPROVAL")}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                <option value="OPEN">Open (Instant Confirm)</option>
                <option value="APPROVAL">Approval Required</option>
              </select>
            </div>
            <div>
              <label htmlFor="game-max" className="block text-xs font-semibold text-[var(--navy-900)]">
                Total Slots
              </label>
              <select
                id="game-max"
                disabled={gameType === "SINGLES"}
                value={gameType === "SINGLES" ? 2 : maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              >
                {gameType === "SINGLES" ? (
                  <option value={2}>2 players (Singles)</option>
                ) : (
                  <>
                    <option value={4}>4 players (Standard Doubles)</option>
                    <option value={3}>3 players</option>
                    <option value={2}>2 players</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="game-skill" className="block text-xs font-semibold text-[var(--navy-900)]">
                Skill Preference
              </label>
              <select
                id="game-skill"
                value={skillLevel}
                onChange={(e) =>
                  setSkillLevel(e.target.value as "" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED")
                }
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Any Level</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label htmlFor="game-style" className="block text-xs font-semibold text-[var(--navy-900)]">
                Play Style
              </label>
              <select
                id="game-style"
                value={playStyle}
                onChange={(e) => setPlayStyle(e.target.value as "" | "CASUAL" | "COMPETITIVE")}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Any Style</option>
                <option value="CASUAL">Casual</option>
                <option value="COMPETITIVE">Competitive</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="game-desc" className="block text-xs font-semibold text-[var(--navy-900)]">
              Notes (Optional)
            </label>
            <textarea
              id="game-desc"
              rows={2}
              maxLength={400}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Feather shuttles, mixed doubles, warm-up near entrance..."
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[42px] rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="min-h-[42px] rounded-xl bg-[var(--stadium-blue)] px-5 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)] disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Game"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
