import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiSuccess, logError } from "@/lib/apiResponse";

// Public schedule summary used by the booking calendar to grey out days the
// salon never opens on + specific-date closures. Everything in here is
// already readable on the schedule_rules RLS policy "Schedule rules are
// viewable by everyone"; we just return it in a shape the UI can consume.
export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess({ closedDaysOfWeek: [2], closedDates: [] }); // Tuesday default
  }

  const { data, error } = await supabase
    .from("schedule_rules")
    .select("rule_type, day_of_week, specific_date, is_closed, stylist_id");

  if (error) {
    logError("public schedule GET", error);
    return apiSuccess({ closedDaysOfWeek: [2], closedDates: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data || []) as any[];
  const salonRows = rows.filter((r) => !r.stylist_id);

  const closedDaysOfWeek = Array.from(
    new Set(
      salonRows
        .filter((r) => r.rule_type === "weekly" && r.is_closed && r.day_of_week !== null)
        .map((r) => r.day_of_week as number),
    ),
  );

  const closedDates = Array.from(
    new Set(
      salonRows
        .filter((r) => r.rule_type === "override" && r.is_closed && r.specific_date)
        .map((r) => r.specific_date as string),
    ),
  );

  // If the DB has no weekly rules yet, fall back to the documented default
  // (Tuesday closed) so the calendar still greys out the right day.
  if (!salonRows.some((r) => r.rule_type === "weekly")) {
    closedDaysOfWeek.push(2);
  }

  return apiSuccess({ closedDaysOfWeek, closedDates });
}
