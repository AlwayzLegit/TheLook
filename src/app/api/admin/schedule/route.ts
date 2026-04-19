import { auth } from "@/lib/auth";
import { adminScheduleSchema } from "@/lib/validation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  const { data, error } = await supabase
    .from("schedule_rules")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    logError("admin/schedule GET", error);
    return apiError("Failed to load schedule.", 500);
  }

  const mapped = (data || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    stylistId: r.stylist_id,
    ruleType: r.rule_type,
    dayOfWeek: r.day_of_week,
    specificDate: r.specific_date,
    startTime: r.start_time,
    endTime: r.end_time,
    isClosed: r.is_closed,
    note: r.note,
  }));

  return apiSuccess(mapped);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = adminScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      `Invalid schedule payload: ${parsed.error.issues[0]?.message || "unknown error"}`,
      400,
    );
  }

  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }

  const { stylistId, ruleType, dayOfWeek, specificDate, startTime, endTime, isClosed, note } = parsed.data;

  // Idempotent save: a rule is uniquely identified by
  // (rule_type, stylist_id-or-salon, specific_date-or-day_of_week). Delete any
  // existing matching row first so re-saving doesn't create duplicates and
  // doesn't leave stale "remove the override" rows that the UI then can't see.
  const matchQuery = supabase
    .from("schedule_rules")
    .delete()
    .eq("rule_type", ruleType);

  if (stylistId) matchQuery.eq("stylist_id", stylistId);
  else matchQuery.is("stylist_id", null);

  if (ruleType === "weekly") {
    if (dayOfWeek === undefined || dayOfWeek === null) {
      return apiError("dayOfWeek required for weekly rule.", 400);
    }
    matchQuery.eq("day_of_week", dayOfWeek);
  } else if (ruleType === "override") {
    if (!specificDate) {
      return apiError("specificDate required for override rule.", 400);
    }
    matchQuery.eq("specific_date", specificDate);
  }

  const { error: deleteErr } = await matchQuery;
  if (deleteErr) {
    logError("admin/schedule POST (cleanup)", deleteErr);
    // Continue — the unique-index migration will catch duplicate inserts.
  }

  const { data: inserted, error } = await supabase
    .from("schedule_rules")
    .insert({
      stylist_id: stylistId || null,
      rule_type: ruleType,
      day_of_week: dayOfWeek ?? null,
      specific_date: specificDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      is_closed: !!isClosed,
      note: note || null,
    })
    .select()
    .single();

  if (error) {
    logError("admin/schedule POST", error);
    return apiError(`Failed to save rule: ${error.message || "unknown error"}`, 500);
  }

  await logAdminAction(
    "schedule.upsert",
    JSON.stringify({ ruleType, dayOfWeek, specificDate, stylistId, isClosed }),
  );

  return apiSuccess({ success: true, rule: inserted });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return apiError("id required", 400);

  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }

  // Capture what we're deleting so we can audit-log it for the
  // "auto-delete" diagnostic — knowing exactly what disappeared and when
  // makes it much easier to track down rogue clients.
  const { data: existing } = await supabase
    .from("schedule_rules")
    .select("rule_type, day_of_week, specific_date, stylist_id, is_closed, note")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("schedule_rules").delete().eq("id", id);
  if (error) {
    logError("admin/schedule DELETE", error);
    return apiError(`Failed to delete rule: ${error.message || "unknown error"}`, 500);
  }

  await logAdminAction("schedule.delete", JSON.stringify({ id, snapshot: existing }));

  return apiSuccess({ success: true });
}
