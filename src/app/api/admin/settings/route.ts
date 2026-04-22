import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

const ALLOWED_KEYS = new Set([
  "staff_notification_emails",
  "staff_notification_sms_numbers",
  "booking_email_enabled",
  "long_appointment_deposit_cents",
  "long_appointment_min_minutes",
  "sms_enabled",
  "sms_booking_confirm_enabled",
  "sms_booking_reminder_enabled",
  "sms_booking_status_change_enabled",
  "sms_booking_cancelled_enabled",
  "sms_booking_reschedule_enabled",
  "sms_staff_new_booking_enabled",
  "idle_timeout_minutes",
]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess({});

  const { data, error } = await supabase.from("salon_settings").select("key, value");
  if (error) {
    logError("settings GET", error);
    return apiError("Failed to load settings.", 500);
  }
  const map: Record<string, string | null> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data || []) as any[]) map[row.key] = row.value;
  return apiSuccess(map);
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const updates = body as Record<string, string>;
  const rows = Object.entries(updates)
    .filter(([k]) => ALLOWED_KEYS.has(k))
    .map(([key, value]) => ({ key, value: value ?? "", updated_at: new Date().toISOString() }));

  if (rows.length === 0) return apiError("Nothing to update.", 400);

  const { error } = await supabase.from("salon_settings").upsert(rows);
  if (error) {
    logError("settings PATCH", error);
    return apiError("Failed to save settings.", 500);
  }
  await logAdminAction("settings.update", JSON.stringify(rows.map((r) => r.key)));
  return apiSuccess({ ok: true });
}
