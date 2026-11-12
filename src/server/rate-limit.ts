type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size >= 500) {
    for (const [entryKey, entry] of buckets) {
      if (now > entry.reset) buckets.delete(entryKey);
    }
  }
  const current = buckets.get(key);
  if (!current || now > current.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true as const };
  }
  if (current.count >= limit) return { ok: false as const, retryAt: current.reset };
  current.count += 1;
  return { ok: true as const };
}

export function resetRateLimits() {
  buckets.clear();
}
