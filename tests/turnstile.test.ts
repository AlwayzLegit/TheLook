import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let verifyTurnstileToken: typeof import("@/lib/turnstile").verifyTurnstileToken;

beforeEach(async () => {
  vi.resetModules();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyTurnstileToken", () => {
  describe("when TURNSTILE_SECRET_KEY is not set", () => {
    it("passes in development (no secret)", async () => {
      process.env.NODE_ENV = "development";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      const result = await verifyTurnstileToken("any-token");
      expect(result.ok).toBe(true);
    });

    it("passes in test (no secret)", async () => {
      process.env.NODE_ENV = "test";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      const result = await verifyTurnstileToken("any-token");
      expect(result.ok).toBe(true);
    });

    it("fails in production (no secret)", async () => {
      process.env.NODE_ENV = "production";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      const result = await verifyTurnstileToken("any-token");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });

  describe("when TURNSTILE_SECRET_KEY is set", () => {
    it("rejects when no token provided", async () => {
      process.env.TURNSTILE_SECRET_KEY = "test-secret";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      const result = await verifyTurnstileToken(undefined);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("required");
    });

    it("verifies token against Cloudflare API (success)", async () => {
      process.env.TURNSTILE_SECRET_KEY = "test-secret";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      // Mock successful verification
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await verifyTurnstileToken("valid-token", "127.0.0.1");
      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it("rejects when Cloudflare returns failure", async () => {
      process.env.TURNSTILE_SECRET_KEY = "test-secret";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: false, "error-codes": ["invalid-input-response"] }),
      });

      const result = await verifyTurnstileToken("bad-token");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("failed");
    });

    it("handles network errors gracefully", async () => {
      process.env.TURNSTILE_SECRET_KEY = "test-secret";
      const mod = await import("@/lib/turnstile");
      verifyTurnstileToken = mod.verifyTurnstileToken;

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await verifyTurnstileToken("token");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("failed");
    });
  });
});
