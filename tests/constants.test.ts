import { describe, it, expect } from "vitest";
import { RATE_LIMITS, BOOKING, POLLING } from "@/lib/constants";

describe("RATE_LIMITS", () => {
  it("has booking rate limit configured", () => {
    expect(RATE_LIMITS.BOOKING.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.BOOKING.windowMs).toBeGreaterThan(0);
  });

  it("has contact rate limit configured", () => {
    expect(RATE_LIMITS.CONTACT.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.CONTACT.windowMs).toBeGreaterThan(0);
  });

  it("contact limit is stricter than booking", () => {
    expect(RATE_LIMITS.CONTACT.limit).toBeLessThanOrEqual(RATE_LIMITS.BOOKING.limit);
  });
});

describe("BOOKING", () => {
  it("has reasonable advance booking window", () => {
    expect(BOOKING.MAX_ADVANCE_DAYS).toBeGreaterThanOrEqual(14);
    expect(BOOKING.MAX_ADVANCE_DAYS).toBeLessThanOrEqual(365);
  });

  it("has 30-minute slot increments", () => {
    expect(BOOKING.SLOT_INCREMENT_MINUTES).toBe(30);
  });
});

describe("POLLING", () => {
  it("has polling interval configured", () => {
    expect(POLLING.APPOINTMENTS_MS).toBeGreaterThanOrEqual(5000);
    expect(POLLING.APPOINTMENTS_MS).toBeLessThanOrEqual(60000);
  });
});
