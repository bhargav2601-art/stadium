export function isStatusStale(updatedAt: Date, now: Date, staleMinutes: number) {
  return now.getTime() - updatedAt.getTime() > staleMinutes * 60 * 1000;
}
