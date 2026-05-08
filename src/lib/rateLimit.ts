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
    // INCR + EXPIRE NX as a single pipeline so the two commands are
    // atomic from Upstash's POV. Previously we issued INCR, awaited the
    // result, then conditionally fired EXPIRE on count==1; if that
    // second fetch failed (network blip, edge timeout) the key was left
    // without a TTL and incremented forever — every subsequent request
    // looked over-limit and got 429 indefinitely (effectively a
    // permanent ban for that bucket). EXPIRE with NX preserves the
    // existing fixed-window semantics: TTL is set once on the first
    // hit of the window and never refreshed by later increments.
    const pipelineRes = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify([
        ["INCR", safeKey],
        ["EXPIRE", safeKey, String(ttlSeconds), "NX"],
      ]),
    });
    if (!pipelineRes.ok) return null;
    const pipelineJson = (await pipelineRes.json()) as Array<{ result?: number }>;
    const count = Number(pipelineJson?.[0]?.result || 0);
    if (!count) return null;

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

