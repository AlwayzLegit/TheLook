import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { logAdminAction } from "@/lib/auditLog";
import { BRANDING_CACHE_TAG } from "@/lib/branding";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

const ALLOWED_KEYS = new Set([
  "staff_notification_emails",
  "staff_notification_sms_numbers",
  "booking_email_enabled",
  "sms_enabled",
  "sms_booking_confirm_enabled",
  "sms_booking_reminder_enabled",
  "sms_booking_status_change_enabled",
  "sms_booking_cancelled_enabled",
  "sms_booking_reschedule_enabled",
  "sms_staff_new_booking_enabled",
  "sms_review_request_enabled",
  "reminder_sms_template",
  "reminder_email_subject_template",
  "reminder_email_body_template",
  "review_request_sms_template",
  "review_request_email_subject_template",
  "review_request_email_body_template",
  "google_review_url",
  "idle_timeout_minutes",
  // Salon identity — DB-backed branding. Empty string falls back to the
  // static defaults in src/lib/strings.ts (see lib/branding.ts).
  "brand_name",
  "brand_tagline",
  "brand_address",
  "brand_phone",
  "brand_email",
  // Credit-card processing surcharge (percentage). CA-legal with proper
  // disclosure at time of transaction. Empty or 0 = no surcharge.
  "deposit_cc_fee_pct",
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
  // If any brand_* key changed, drop the cached branding so the next
  // render on any page picks up the new values immediately instead of
  // waiting for the 60-second revalidate.
  if (rows.some((r) => r.key.startsWith("brand_"))) {
    revalidateTag(BRANDING_CACHE_TAG);
  }
  await logAdminAction("settings.update", JSON.stringify(rows.map((r) => r.key)));
  return apiSuccess({ ok: true });
}
