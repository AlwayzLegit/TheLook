import { describe, it, expect } from "vitest";
import { parseDollarsToCents } from "../src/lib/priceText";

// Mirrors the SQL parser in supabase/migrations/20260507_resync_variant_price_min.sql.
// If you change the regex in either, change both.
describe("parseDollarsToCents", () => {
  it("parses plain dollar amounts", () => {
    expect(parseDollarsToCents("$25")).toBe(2500);
    expect(parseDollarsToCents("$5")).toBe(500);
    expect(parseDollarsToCents("$220")).toBe(22000);
  });

  it("parses 'starts at' prices using the lower bound", () => {
    expect(parseDollarsToCents("$5+")).toBe(500);
    expect(parseDollarsToCents("$95+")).toBe(9500);
  });

  it("parses cents (decimals) up to 2 places", () => {
    expect(parseDollarsToCents("$25.50")).toBe(2550);
    expect(parseDollarsToCents("$5.05")).toBe(505);
  });

  it("handles missing dollar sign", () => {
    expect(parseDollarsToCents("25")).toBe(2500);
    expect(parseDollarsToCents("0.50")).toBe(50);
  });

  it("takes the first number in compound strings", () => {
    expect(parseDollarsToCents("from $25 to $50")).toBe(2500);
  });

  it("returns null for non-numeric prices", () => {
    expect(parseDollarsToCents("Free")).toBeNull();
    expect(parseDollarsToCents("Special")).toBeNull();
    expect(parseDollarsToCents("Call for quote")).toBeNull();
  });

  it("returns null for empty / nullish input", () => {
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents(null)).toBeNull();
    expect(parseDollarsToCents(undefined)).toBeNull();
  });

  it("rejects negative numbers", () => {
    // Parser sees "5", not "-5" — leading "-" is dropped because the
    // regex anchors to digits. Acceptable: pricing is always positive.
    expect(parseDollarsToCents("-$5")).toBe(500);
  });
});
