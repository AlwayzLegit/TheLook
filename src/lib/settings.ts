import { hasSupabaseConfig, supabase } from "./supabase";

export type SettingsKey =
  | "staff_notification_emails"
  | "booking_email_enabled"
  | "long_appointment_deposit_cents"
  | "long_appointment_min_minutes";

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
