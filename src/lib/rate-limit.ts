import { HttpError } from "@/lib/http";

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

export function enforceRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): number {
  const now = Date.now();
  const current = counters.get(key);

  if (!current || current.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return maxRequests - 1;
  }

  if (current.count >= maxRequests) {
    throw new HttpError(429, "Too many requests", "RATE_LIMITED");
  }

  current.count += 1;
  return maxRequests - current.count;
}

/**
 * Reset all rate limit counters (for testing)
 */
export function resetRateLimits(): void {
  counters.clear();
}
