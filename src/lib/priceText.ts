// Parse a human-typed price string like "$25", "$25.50", "$5+" into
// integer cents. Returns null when the string doesn't contain a
// recognisable dollar amount ("Free", "Special", "Call for quote") so
// callers can fall back to whatever price_min was supplied separately.
//
// Why this exists: the variant editor at /admin/services exposed
// `price_text` (the visible string) and `price_min` (cents, used for
// math) as two separate inputs. Owners updated `price_text` to "$25"
// but never touched `price_min`, leaving variants with text "$25" /
// price_min 500 (the parent's "$5+" cents). Booking footer summed
// the stale cents → customers saw $5 totals on $25 services. Now
// every variant save derives cents from text whenever possible so
// the two fields can't drift.
//
// Examples:
//   parseDollarsToCents("$25")    → 2500
//   parseDollarsToCents("$5+")    → 500   (the "+" suffix is a "starts at" hint, not part of the number)
//   parseDollarsToCents("$25.50") → 2550
//   parseDollarsToCents("25")     → 2500  ("$" is optional)
//   parseDollarsToCents("Free")   → null
//   parseDollarsToCents("")       → null

export function parseDollarsToCents(text: string | null | undefined): number | null {
  if (!text) return null;
  // Pull the FIRST number (with optional decimal portion). "$25.50+"
  // → "25.50". "from $5 to $10" → "5" (we take the lower bound,
  // matches the "starts at" semantic the rest of the app uses).
  const match = text.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const dollars = parseFloat(match[1]);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}
