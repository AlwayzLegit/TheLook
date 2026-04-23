const buckets = new Map<string, number[]>();

// Periodic sweep so the in-memory bucket map never grows unbounded
// (findings audit P2 #14). Without it, unique keys — IP, email —
// accumulate forever and the process RSS creeps up. Single timer per
// process, cleared at shutdown. No-op when the module is imported in
// an edge runtime that doesn't expose setInterval; we guard on it.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_AGE_MS = 60 * 60 * 1000;
if (typeof setInterval === "function" && typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __theLookRlSweep?: NodeJS.Timeout };
  if (!g.__theLookRlSweep) {
    g.__theLookRlSweep = setInterval(() => {
      const cutoff = Date.now() - MAX_AGE_MS;
      for (const [key, ts] of buckets) {
        const kept = ts.filter((t) => t > cutoff);
        if (kept.length === 0) buckets.delete(key);
        else buckets.set(key, kept);
      }
    }, SWEEP_INTERVAL_MS);
    // Prevent the timer from keeping the process alive in test harnesses.
    (g.__theLookRlSweep as { unref?: () => void }).unref?.();
  }
}

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

async function checkUpstashRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<{ ok: boolean; remaining: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const safeKey = encodeURIComponent(`rl:${key}`);
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const incrRes = await fetch(`${url}/incr/${safeKey}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = Number(incrJson.result || 0);

    if (count === 1) {
      await fetch(`${url}/expire/${safeKey}/${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }

    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
    };
  } catch {
    return null;
  }
}

function checkMemoryRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = buckets.get(key) || [];
  const recent = existing.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    return { ok: false, remaining: 0 };
  }

  recent.push(now);
  buckets.set(key, recent);

  return { ok: true, remaining: Math.max(0, limit - recent.length) };
}

export async function checkRateLimit(options: RateLimitOptions) {
  const distributed = await checkUpstashRateLimit(options);
  if (distributed) return distributed;
  return checkMemoryRateLimit(options);
}

