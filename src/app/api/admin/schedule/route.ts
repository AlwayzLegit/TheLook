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
    return apiError("Invalid schedule payload.", 400);
  }

  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }

  const { stylistId, ruleType, dayOfWeek, specificDate, startTime, endTime, isClosed, note } = parsed.data;

  const { error } = await supabase.from("schedule_rules").insert({
    stylist_id: stylistId || null,
    rule_type: ruleType,
    day_of_week: dayOfWeek ?? null,
    specific_date: specificDate || null,
    start_time: startTime || null,
    end_time: endTime || null,
    is_closed: !!isClosed,
    note: note || null,
  });

  if (error) {
    logError("admin/schedule POST", error);
    return apiError("Failed to add rule.", 500);
  }

  logAdminAction("schedule.create", JSON.stringify({ ruleType, dayOfWeek, specificDate }));

  return apiSuccess({ success: true });
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

  const { error } = await supabase.from("schedule_rules").delete().eq("id", id);
  if (error) {
    logError("admin/schedule DELETE", error);
    return apiError("Failed to delete rule.", 500);
  }

  logAdminAction("schedule.delete", JSON.stringify({ id }));

  return apiSuccess({ success: true });
}
