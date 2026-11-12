export const GAME_STATUSES = [
  "CREATED",
  "OPEN",
  "FULL",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "INCOMPLETE",
  "WAITING_FOR_REPLACEMENT",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];
export type GameType = "SINGLES" | "DOUBLES";

const TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  CREATED: ["OPEN", "CANCELLED"],
  OPEN: ["FULL", "IN_PROGRESS", "CANCELLED", "WAITING_FOR_REPLACEMENT"],
  FULL: ["OPEN", "IN_PROGRESS", "CANCELLED", "WAITING_FOR_REPLACEMENT"],
  IN_PROGRESS: ["COMPLETED", "INCOMPLETE", "WAITING_FOR_REPLACEMENT"],
  WAITING_FOR_REPLACEMENT: ["OPEN", "FULL", "IN_PROGRESS", "CANCELLED", "INCOMPLETE"],
  COMPLETED: [],
  CANCELLED: [],
  INCOMPLETE: [],
};

export function canTransition(from: GameStatus, to: GameStatus) {
  return from === to || TRANSITIONS[from].includes(to);
}

export function assertTransition(from: GameStatus, to: GameStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`A game cannot move from ${from} to ${to}.`);
  }
}

export function assertMaxPlayers(type: GameType, maxPlayers: number) {
  if (type === "SINGLES" && maxPlayers !== 2) {
    throw new Error("Singles games have exactly 2 players.");
  }
  if (type === "DOUBLES" && (maxPlayers < 2 || maxPlayers > 4)) {
    throw new Error("Doubles games allow 2, 3, or 4 players. 4 is a full game.");
  }
}

export function minimumToStart(type: GameType) {
  return type === "SINGLES" ? 2 : 2;
}

export function canStartGame(type: GameType, confirmedCount: number) {
  return confirmedCount >= minimumToStart(type) && (type === "DOUBLES" || confirmedCount === 2);
}

export function statusAfterRosterChange(input: {
  count: number;
  max: number;
  current: GameStatus;
  started: boolean;
  replacementOpen?: boolean;
}) {
  const { count, max, current, started, replacementOpen } = input;
  if (current === "CANCELLED" || current === "COMPLETED" || current === "INCOMPLETE" || current === "CREATED") {
    return current;
  }
  if (current === "IN_PROGRESS" && !replacementOpen) return "IN_PROGRESS";
  if (replacementOpen || current === "WAITING_FOR_REPLACEMENT") {
    if (count >= max) return started ? "IN_PROGRESS" : "FULL";
    return "WAITING_FOR_REPLACEMENT";
  }
  if (count >= max) return "FULL";
  return started ? "IN_PROGRESS" : "OPEN";
}

export function openSlots(count: number, max: number) {
  return Math.max(0, max - count);
}
