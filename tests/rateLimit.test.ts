import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to reset the in-memory buckets between tests.
// The module uses a module-level Map, so we re-import each time.
let checkRateLimit: typeof import("@/lib/rateLimit").checkRateLimit;

beforeEach(async () => {
  // Clear module cache to reset in-memory buckets
  vi.resetModules();
  // Ensure no Upstash env vars so we test in-memory limiter
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const mod = await import("@/lib/rateLimit");
  checkRateLimit = mod.checkRateLimit;
});

describe("checkRateLimit (in-memory)", () => {
  it("allows requests under the limit", async () => {
    const result = await checkRateLimit({ key: "test:1", limit: 5, windowMs: 60000 });
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows exactly up to the limit", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit({ key: "test:2", limit: 3, windowMs: 60000 });
    }
    const result = await checkRateLimit({ key: "test:2", limit: 3, windowMs: 60000 });
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests over the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit({ key: "test:3", limit: 5, windowMs: 60000 });
    }
    const result = await checkRateLimit({ key: "test:3", limit: 5, windowMs: 60000 });
    expect(result.ok).toBe(false);
  });

  it("uses separate buckets for different keys", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit({ key: "user:A", limit: 3, windowMs: 60000 });
    }
    // user:A is exhausted
    expect((await checkRateLimit({ key: "user:A", limit: 3, windowMs: 60000 })).ok).toBe(false);
    // user:B should still be fine
    expect((await checkRateLimit({ key: "user:B", limit: 3, windowMs: 60000 })).ok).toBe(true);
  });

  it("returns correct remaining count", async () => {
    const r1 = await checkRateLimit({ key: "test:4", limit: 5, windowMs: 60000 });
    expect(r1.remaining).toBe(4);
    const r2 = await checkRateLimit({ key: "test:4", limit: 5, windowMs: 60000 });
    expect(r2.remaining).toBe(3);
    const r3 = await checkRateLimit({ key: "test:4", limit: 5, windowMs: 60000 });
    expect(r3.remaining).toBe(2);
  });
});
