export type TimeSlot = {
  date: string;
  period: "MORNING" | "EVENING";
  startTime: string | null;
  durationMin: number;
};

function windowFor(slot: TimeSlot): [number, number] | "period" {
  if (!slot.startTime) return "period";
  const [hour, minute] = slot.startTime.split(":").map(Number);
  const start = hour * 60 + minute;
  return [start, start + slot.durationMin];
}

/** A game without a clock time occupies its whole morning or evening period. */
export function slotsOverlap(a: TimeSlot, b: TimeSlot) {
  if (a.date !== b.date || a.period !== b.period) return false;
  const left = windowFor(a);
  const right = windowFor(b);
  if (left === "period" || right === "period") return true;
  return left[0] < right[1] && right[0] < left[1];
}
