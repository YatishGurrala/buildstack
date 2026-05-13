import { HttpError } from "@/lib/http";

// ── Provider interface ────────────────────────────────────────────────────────
// The default implementation is in-process memory, which works correctly for
// single-instance deployments only.  For multi-instance (load-balanced)
// deployments, replace the store with a shared backend (e.g. Redis) before any
// requests are handled:
//
//   import { setRateLimiterStore } from "@/lib/rate-limit";
//   setRateLimiterStore(new RedisRateLimiterStore(redisClient));
//
export interface RateLimiterStore {
  enforce(key: string, maxRequests: number, windowMs: number): number;
  reset(): void;
}

type Counter = {
  count: number;
  resetAt: number;
};

class MemoryRateLimiterStore implements RateLimiterStore {
  private readonly counters = new Map<string, Counter>();

  enforce(key: string, maxRequests: number, windowMs: number): number {
    const now = Date.now();
    const current = this.counters.get(key);

    if (!current || current.resetAt <= now) {
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return maxRequests - 1;
    }

    if (current.count >= maxRequests) {
      throw new HttpError(429, "Too many requests", "RATE_LIMITED");
    }

    current.count += 1;
    return maxRequests - current.count;
  }

  reset(): void {
    this.counters.clear();
  }
}

let activeStore: RateLimiterStore = new MemoryRateLimiterStore();

/**
 * Swap the rate-limiter backend.  Call this once at startup before handling
 * requests.  Required for multi-instance deployments.
 */
export function setRateLimiterStore(store: RateLimiterStore): void {
  activeStore = store;
}

export function enforceRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): number {
  return activeStore.enforce(key, maxRequests, windowMs);
}

/**
 * Reset all rate limit counters (for testing)
 */
export function resetRateLimits(): void {
  activeStore.reset();
}
