import { enforceRateLimit, resetRateLimits } from '@/lib/rate-limit';
import { HttpError } from '@/lib/http';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('should allow requests within limit', () => {
    const key = 'test-key-1';
    const limit = 5;
    const window = 1000;

    for (let i = 0; i < limit; i++) {
      expect(() => enforceRateLimit(key, limit, window)).not.toThrow();
    }
  });

  it('should throw on exceeding rate limit', () => {
    const key = 'test-key-2';
    const limit = 3;
    const window = 1000;

    enforceRateLimit(key, limit, window);
    enforceRateLimit(key, limit, window);
    enforceRateLimit(key, limit, window);

    expect(() => enforceRateLimit(key, limit, window)).toThrow(HttpError);
    expect(() => enforceRateLimit(key, limit, window)).toThrow('Too many requests');
  });

  it('should have separate limits per key', () => {
    const key1 = 'key-1';
    const key2 = 'key-2';
    const limit = 2;
    const window = 1000;

    enforceRateLimit(key1, limit, window);
    enforceRateLimit(key1, limit, window);

    // key2 should still have available quota
    expect(() => enforceRateLimit(key2, limit, window)).not.toThrow();
  });

  it('should return remaining count', () => {
    const key = 'test-key-3';
    const limit = 3;
    const window = 1000;

    enforceRateLimit(key, limit, window);
    const result = enforceRateLimit(key, limit, window);

    expect(result).toBe(1); // 1 remaining after 2 requests with limit 3
  });
});
