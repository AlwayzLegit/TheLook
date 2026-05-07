import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

type Limiter = {
  limit: (key: string) => Promise<{ success: boolean; reset: number; remaining: number; limit: number }>;
};

const noopLimiter: Limiter = {
  async limit() {
    return { success: true, reset: 0, remaining: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER };
  },
};

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!_redis) _redis = new Redis({ url, token });
  return _redis;
}

function build(prefix: string, max: number, windowSec: number): Limiter {
  const redis = getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[ratelimit] ${prefix}: UPSTASH_REDIS_REST_* env vars missing; rate limit disabled`);
    }
    return noopLimiter;
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    analytics: false,
    prefix: `rl:${prefix}`,
  });
}

// 5 sign-in attempts per minute per IP. Tight because brute-force gates the whole admin.
export const loginLimiter = build("login", 5, 60);

// 10 bookings per IP per 10 minutes — covers normal flow with room for retry.
export const bookingLimiter = build("booking", 10, 600);

// 5 cancellations per IP per 10 minutes.
export const cancelLimiter = build("cancel", 5, 600);

export function clientKey(req: NextRequest, fallback = "anon"): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    fallback
  );
}
