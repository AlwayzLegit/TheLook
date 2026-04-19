import { hasSupabaseConfig, supabase } from "./supabase";

interface NotifyParams {
  type: string;
  title: string;
  body?: string;
  appointmentId?: string;
  url?: string;
  // Send to every admin user.
  toAllAdmins?: boolean;
  // Send to a specific stylist's dashboard.
  toStylistId?: string;
}

// Fire-and-forget — never throw, never block the caller. Booking flow stays
// responsive even if Supabase momentarily refuses the insert.
export async function createNotification(params: NotifyParams): Promise<void> {
  if (!hasSupabaseConfig) return;
  const rows: Record<string, unknown>[] = [];
  if (params.toAllAdmins) {
    rows.push({
      recipient_role: "admin",
      type: params.type,
      title: params.title,
      body: params.body || null,
      appointment_id: params.appointmentId || null,
      url: params.url || null,
    });
  }
  if (params.toStylistId) {
    rows.push({
      recipient_stylist_id: params.toStylistId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      appointment_id: params.appointmentId || null,
      url: params.url || null,
    });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("createNotification:", error);
}
