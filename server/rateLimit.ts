type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (key: string): RateLimitResult => {
    const now = Date.now();
    const existing = hits.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + options.windowMs;
      hits.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: Math.max(options.max - 1, 0),
        resetAt,
      };
    }

    if (existing.count >= options.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(options.max - existing.count, 0),
      resetAt: existing.resetAt,
    };
  };
}
