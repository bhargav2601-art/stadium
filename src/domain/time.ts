export const STADIUM_TIME_ZONE = "Asia/Kolkata";

const PERIOD_END: Record<"MORNING" | "EVENING", number> = {
  MORNING: 10 * 60,
  EVENING: 21 * 60,
};

export function kolkataParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: STADIUM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(hour) * 60 + Number(parts.minute),
  };
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function dateFromIso(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDays(iso: string, days: number) {
  const date = dateFromIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function isSlotInPast(options: {
  date: string;
  period: "MORNING" | "EVENING";
  startTime?: string | null;
  now?: Date;
}) {
  const { date, minutes } = kolkataParts(options.now ?? new Date());
  if (options.date > date) return false;
  if (options.date < date) return true;
  if (options.startTime) {
    const [hour, minute] = options.startTime.split(":").map(Number);
    return hour * 60 + minute <= minutes;
  }
  return minutes >= PERIOD_END[options.period];
}

export function scheduledStart(date: string, startTime: string | null, period: "MORNING" | "EVENING") {
  const time = startTime ?? (period === "MORNING" ? "06:00" : "16:00");
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(`${date}T${time}:00.000Z`);
  const parts = kolkataParts(utcGuess);
  const dayDeltaMs = dateFromIso(date).getTime() - dateFromIso(parts.date).getTime();
  const targetMinutes = hour * 60 + minute;
  const minuteDeltaMs = (targetMinutes - parts.minutes) * 60 * 1000;
  return new Date(utcGuess.getTime() + dayDeltaMs + minuteDeltaMs);
}
