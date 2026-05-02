import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiSuccess, logError } from "@/lib/apiResponse";

// Public schedule summary. Consumed by:
//   • The booking calendar (needs closedDaysOfWeek + closedDates)
//   • The Footer + Contact "Salon hours" blocks (needs weeklyHours)
//   • The booking calendar again, after the customer picks a stylist
//     — needs per-stylist closures so days that the stylist personally
//     doesn't work are blocked from the calendar instead of letting
//     the customer click and get "no slots, try another day".
// Keeping a single endpoint so admin-side schedule edits propagate
// everywhere without more wiring.

const DEFAULT_WEEKLY: Record<number, { start: string | null; end: string | null; closed: boolean }> = {
  0: { start: "10:00", end: "17:00", closed: false }, // Sunday
  1: { start: "10:00", end: "18:00", closed: false }, // Monday
  2: { start: null, end: null, closed: true },         // Tuesday
  3: { start: "10:00", end: "18:00", closed: false }, // Wednesday
  4: { start: "10:00", end: "18:00", closed: false }, // Thursday
  5: { start: "10:00", end: "18:00", closed: false }, // Friday
  6: { start: "10:00", end: "18:00", closed: false }, // Saturday
};

export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess({
      weeklyHours: DEFAULT_WEEKLY,
      closedDaysOfWeek: [2],
      closedDates: [],
      stylistClosures: {},
    });
  }

  const { data, error } = await supabase
    .from("schedule_rules")
    .select("rule_type, day_of_week, specific_date, start_time, end_time, is_closed, stylist_id");

  if (error) {
    logError("public schedule GET", error);
    return apiSuccess({
      weeklyHours: DEFAULT_WEEKLY,
      closedDaysOfWeek: [2],
      closedDates: [],
      stylistClosures: {},
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data || []) as any[];
  const salonRows = rows.filter((r) => !r.stylist_id);
  const weeklySalonRows = salonRows.filter((r) => r.rule_type === "weekly");
  const hasAnyWeekly = weeklySalonRows.length > 0;

  // Merge DB rules over the fallback defaults so every day has a row and the
  // UI can render a full Mon-Sun list even if admin only configured a few.
  const weeklyHours: typeof DEFAULT_WEEKLY = { ...DEFAULT_WEEKLY };
  for (const r of weeklySalonRows) {
    if (r.day_of_week === null || r.day_of_week === undefined) continue;
    weeklyHours[r.day_of_week as number] = {
      start: r.start_time ?? null,
      end: r.end_time ?? null,
      closed: !!r.is_closed,
    };
  }

  const closedDaysOfWeek = Array.from(
    new Set(
      Object.entries(weeklyHours)
        .filter(([, v]) => v.closed)
        .map(([k]) => Number(k)),
    ),
  );

  const closedDates = Array.from(
    new Set(
      salonRows
        .filter((r) => r.rule_type === "override" && r.is_closed && r.specific_date)
        .map((r) => r.specific_date as string),
    ),
  );

  // Per-stylist closures. Same shape as the salon-level data —
  // one closedDaysOfWeek + closedDates pair per stylist that has
  // any rules. Stylists with no rules don't appear in the map at
  // all (the calendar then only applies salon-level closures
  // for that stylist).
  //
  // Two ways a stylist can be "closed" on a given day:
  //   1. weekly rule with is_closed=true on that day_of_week
  //   2. weekly rule MISSING for that day_of_week — meaning admin
  //      explicitly configured weekly hours for the stylist and
  //      omitted that day. Without this, a stylist whose admin
  //      added rows for Sat+Sun only would still appear available
  //      Mon-Fri (as the salon's default schedule).
  // The owner's example (Kristina off Sun + Tue) maps directly:
  // admin saves weekly rules for Mon/Wed/Thu/Fri/Sat — the calendar
  // marks the missing days (Sun, Tue) as closed for that stylist.
  const stylistRows = rows.filter((r) => r.stylist_id);
  const byStylist = new Map<string, typeof rows>();
  for (const r of stylistRows) {
    const key = r.stylist_id as string;
    const arr = byStylist.get(key) || [];
    arr.push(r);
    byStylist.set(key, arr);
  }

  const stylistClosures: Record<
    string,
    { closedDaysOfWeek: number[]; closedDates: string[] }
  > = {};

  for (const [stylistId, sRows] of byStylist) {
    const weekly = sRows.filter((r) => r.rule_type === "weekly");
    const overrides = sRows.filter(
      (r) => r.rule_type === "override" && r.is_closed && r.specific_date,
    );

    const closedDows = new Set<number>();
    if (weekly.length > 0) {
      // Build the set of days the stylist DOES work, then close
      // the complement. A weekly row with is_closed=true also
      // counts toward the "closed" set.
      const openDows = new Set<number>();
      for (const r of weekly) {
        if (r.day_of_week === null || r.day_of_week === undefined) continue;
        if (r.is_closed) {
          closedDows.add(r.day_of_week as number);
        } else {
          openDows.add(r.day_of_week as number);
        }
      }
      for (let d = 0; d < 7; d++) {
        if (!openDows.has(d)) closedDows.add(d);
      }
    }
    // Stylists with no weekly rules at all → defer entirely to
    // the salon-level closures (don't add an entry).
    if (closedDows.size === 0 && overrides.length === 0) continue;

    stylistClosures[stylistId] = {
      closedDaysOfWeek: Array.from(closedDows).sort((a, b) => a - b),
      closedDates: Array.from(
        new Set(overrides.map((r) => r.specific_date as string)),
      ),
    };
  }

  return apiSuccess({
    weeklyHours,
    closedDaysOfWeek,
    closedDates,
    stylistClosures,
    // Present for backward compat so older clients still work.
    _meta: { usedDefaults: !hasAnyWeekly },
  });
}

