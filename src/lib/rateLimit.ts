const buckets = new Map<string, number[]>();

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

