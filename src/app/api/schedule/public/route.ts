import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiSuccess, logError } from "@/lib/apiResponse";

// Public schedule summary. Consumed by:
//   • The booking calendar (needs closedDaysOfWeek + closedDates)
//   • The Footer + Contact "Salon hours" blocks (needs weeklyHours)
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

  return apiSuccess({
    weeklyHours,
    closedDaysOfWeek,
    closedDates,
    // Present for backward compat so older clients still work.
    _meta: { usedDefaults: !hasAnyWeekly },
  });
}

