import { supabase, hasSupabaseConfig } from "./supabase";

/**
 * Log an admin action to the admin_log table.
 * Fire-and-forget: failures are logged but never block the caller.
 */
export async function logAdminAction(
  action: string,
  details?: string,
  appointmentId?: string
) {
  if (!hasSupabaseConfig) return;

  try {
    await supabase.from("admin_log").insert({
      action,
      appointment_id: appointmentId || null,
      details: details || null,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
