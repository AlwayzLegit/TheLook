/**
 * Display-layer formatting helpers used across the admin UI. All money is
 * stored in cents in the database; all time is stored as ISO strings or
 * HH:MM varchars. These helpers ensure a single consistent render on screen.
 *
 * — formatMoney: always two decimals, thousands separators, $ prefix.
 * — formatTime:  12-hour everywhere ("4:30 PM") regardless of source format.
 * — formatDate:  three styles — short, long, relative.
 * — formatDuration: "1 hr 10 min" from a minute count.
 */

const TZ = "America/Los_Angeles";

// ───────── Money ─────────
// Accepts either cents (integer) or dollars (float). Cents is the canonical
// DB representation; the UI often receives one or the other. Integer > 10000
// is treated as cents; anything smaller or fractional is treated as dollars.
// Caller can force with opts.from = "cents" | "dollars".
export function formatMoney(
  value: number | null | undefined,
  opts: { from?: "cents" | "dollars"; sign?: boolean } = {},
): string {
  if (value == null || Number.isNaN(value)) return "—";
  let dollars: number;
  if (opts.from === "cents") {
    dollars = value / 100;
  } else if (opts.from === "dollars") {
    dollars = value;
  } else {
    // Heuristic fallback — prefer cents when the value is a big integer.
    dollars = Number.isInteger(value) && Math.abs(value) >= 100 ? value / 100 : value;
  }
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const out = fmt.format(dollars);
  if (opts.sign && dollars > 0) return `+${out}`;
  return out;
}

// ───────── Time ─────────
// Accepts "HH:MM" (24h varchar), ISO string, or Date.
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  let h: number;
  let m: number;
  if (typeof input === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(input)) {
    const [hh, mm] = input.split(":").map(Number);
    h = hh;
    m = mm;
  } else {
    const d = typeof input === "string" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return "—";
    // Render in LA timezone so staff see appointment-local times.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(d);
    const hourPart = parts.find((p) => p.type === "hour")?.value || "";
    const minPart = parts.find((p) => p.type === "minute")?.value || "";
    const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value || "";
    return `${hourPart}:${minPart} ${dayPeriod}`;
  }
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ───────── Date ─────────
// styles:
//   short    → "Apr 24"
//   long     → "Friday, April 24, 2026"
//   withDay  → "Fri, Apr 24"
//   relative → "Today", "Tomorrow", "Yesterday", "In 3 days", "2 weeks ago"
export function formatDate(
  input: string | Date | null | undefined,
  style: "short" | "long" | "withDay" | "relative" = "withDay",
): string {
  if (!input) return "—";
  let d: Date;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // YYYY-MM-DD — keep it anchored to local day.
    d = new Date(`${input}T12:00:00`);
  } else {
    d = typeof input === "string" ? new Date(input) : input;
  }
  if (Number.isNaN(d.getTime())) return "—";

  if (style === "relative") {
    const now = new Date();
    const dayMs = 86_400_000;
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOf(d) - startOf(now)) / dayMs);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (Math.abs(diffDays) < 7) {
      return diffDays > 0 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
    }
    const weeks = Math.round(diffDays / 7);
    if (Math.abs(weeks) < 4) return weeks > 0 ? `In ${weeks} wk` : `${Math.abs(weeks)} wk ago`;
    // Fall through to short form for anything over ~a month away.
    style = "short";
  }

  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : style === "short"
        ? { timeZone: TZ, month: "short", day: "numeric" }
        : { timeZone: TZ, weekday: "short", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat("en-US", opts).format(d);
}

// ───────── Duration ─────────
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

// ───────── Initials ─────────
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return "?";
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .slice(0, max)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ───────── Email display ─────────
// Plan bug #6: walk-in clients have synthetic emails like
// "phone-3109787389@noemail.thelookhairsalonla.com". These should never
// render in the UI — we treat the client as having no email on file.
const SYNTHETIC_EMAIL_SUFFIX = "@noemail.thelookhairsalonla.com";

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

export function displayEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  if (isSyntheticEmail(email)) return null;
  return email;
}
