// All date/time handling for the salon is anchored to America/Los_Angeles.
// Server runs in UTC on Vercel; the browser uses the visitor's local zone.
// Routing every date check through these helpers keeps "today" consistent.

const LA_TZ = "America/Los_Angeles";

function getLAParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: LA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === "24" ? "00" : parts.hour,
    minute: parts.minute,
  };
}

// YYYY-MM-DD for "today" in Los Angeles, regardless of server tz.
export function todayISOInLA(now: Date = new Date()): string {
  const p = getLAParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

// Add `days` calendar days to today (LA) and return YYYY-MM-DD.
export function addDaysISOInLA(days: number, now: Date = new Date()): string {
  const todayISO = todayISOInLA(now);
  const [y, m, d] = todayISO.split("-").map(Number);
  // Build a Date at noon LA on that day, then shift in plain UTC ms — the
  // UTC->LA conversion can never cross midnight when starting at noon, even
  // around DST transitions.
  const base = Date.UTC(y, m - 1, d, 12, 0, 0);
  const shifted = new Date(base + days * 24 * 60 * 60 * 1000);
  const p = getLAParts(shifted);
  return `${p.year}-${p.month}-${p.day}`;
}

// Minutes since midnight, in LA. Useful for "is this slot in the past today?"
export function nowMinutesInLA(now: Date = new Date()): number {
  const p = getLAParts(now);
  return parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10);
}

// 0=Sunday..6=Saturday for the given YYYY-MM-DD interpreted as an LA date.
export function dayOfWeekInLA(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  // Anchor at noon UTC and read the LA weekday so DST shifts can't push us
  // into the previous/next day.
  const anchor = new Date(Date.UTC(y, m - 1, d, 19, 0, 0));
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LA_TZ,
    weekday: "short",
  });
  const wk = fmt.format(anchor);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wk] ?? 0;
}

export function isPastDateInLA(dateISO: string, now: Date = new Date()): boolean {
  return dateISO < todayISOInLA(now);
}
