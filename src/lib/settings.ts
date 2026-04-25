import { hasSupabaseConfig, supabase } from "./supabase";

export type SettingsKey =
  | "staff_notification_emails"
  | "staff_notification_sms_numbers"
  | "booking_email_enabled"
  | "sms_enabled"
  | "sms_booking_confirm_enabled"
  | "sms_booking_reminder_enabled"
  | "sms_booking_status_change_enabled"
  | "sms_booking_cancelled_enabled"
  | "sms_booking_reschedule_enabled"
  | "sms_staff_new_booking_enabled"
  | "sms_review_request_enabled"
  // Templates (admin-editable)
  | "reminder_sms_template"
  | "reminder_email_subject_template"
  | "reminder_email_body_template"
  | "review_request_sms_template"
  | "review_request_email_subject_template"
  | "review_request_email_body_template"
  | "google_review_url"
  // "true" (default) → flipping an appointment to status=completed
  // auto-fires the review request. "false" disables auto-send.
  | "auto_review_request_enabled"
  // Admin UX
  | "idle_timeout_minutes"
  // Booking — credit-card processing surcharge (percentage, e.g. "4")
  | "deposit_cc_fee_pct";

const cache = new Map<string, { value: string | null; ts: number }>();
const TTL_MS = 30_000;

export async function getSetting(key: SettingsKey): Promise<string | null> {
  if (!hasSupabaseConfig) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.value;

  const { data, error } = await supabase
    .from("salon_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("getSetting:", key, error);
    return null;
  }
  const value = (data?.value as string | null) ?? null;
  cache.set(key, { value, ts: Date.now() });
  return value;
}

export async function setSetting(key: SettingsKey, value: string): Promise<boolean> {
  if (!hasSupabaseConfig) return false;
  const { error } = await supabase
    .from("salon_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) {
    console.error("setSetting:", key, error);
    return false;
  }
  cache.set(key, { value, ts: Date.now() });
  return true;
}

// Parses the comma/newline-separated emails stored in
// `staff_notification_emails` and returns trimmed, lowercased addresses.
export async function getStaffNotificationEmails(): Promise<string[]> {
  const raw = await getSetting("staff_notification_emails");
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

// Staff phone numbers for SMS alerts. Stored as comma/newline-separated
// in `staff_notification_sms_numbers`. Normalisation happens downstream in
// sms.ts — this just returns trimmed non-empty entries.
export async function getStaffNotificationSmsNumbers(): Promise<string[]> {
  const raw = await getSetting("staff_notification_sms_numbers");
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 7);
}
