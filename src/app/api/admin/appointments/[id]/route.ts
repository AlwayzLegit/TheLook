import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminAppointmentPatchSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sendStatusChangeEmail } from "@/lib/email";
import { sendStatusChangeSMS } from "@/lib/sms";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await request.json();
  const parsed = adminAppointmentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid appointment payload.", 400);
  }
  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }
  const payload = parsed.data;

  const updateData: Record<string, unknown> = {};

  if (payload.status) updateData.status = payload.status;
  if (payload.staff_notes !== undefined) updateData.staff_notes = payload.staff_notes;
  if (payload.date) updateData.date = payload.date;
  if (payload.start_time) updateData.start_time = payload.start_time;
  if (payload.end_time) updateData.end_time = payload.end_time;

  // Stamp approver info whenever a pending booking becomes confirmed.
  // Kept in its own object so we can cleanly retry without it if the DB
  // schema pre-dates the 20260419 salon_fixes migration (which added the
  // approved_at / approved_by columns).
  const approvalStamp: Record<string, unknown> = {};
  if (payload.status === "confirmed") {
    approvalStamp.approved_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvalStamp.approved_by = (session.user as any)?.email || (session.user as any)?.name || "admin";
  }

  updateData.updated_at = new Date().toISOString();

  let { data, error } = await supabase
    .from("appointments")
    .update({ ...updateData, ...approvalStamp })
    .eq("id", id)
    .select()
    .single();

  // If the approved_at/approved_by columns don't exist yet (migration not
  // applied), Supabase returns PGRST204 "Could not find the column ..." or
  // an error message containing the column name. Retry without the stamp
  // so Confirm still works on older schemas.
  if (error && /approved_(at|by)/i.test(error.message || "")) {
    logError("admin/appointments PATCH (approval-stamp cols missing, retrying)", error);
    ({ data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single());
  }

  if (error) {
    logError("admin/appointments PATCH", error);
    return apiError(`Failed to update appointment: ${error.message || "unknown error"}`, 500);
  }

  logAdminAction("appointment.update", JSON.stringify(payload), id);

  // Send email + SMS on meaningful status transitions only. Clients
  // don't benefit from a "your booking was marked completed" ping —
  // they already know they were just in the chair. Same for no_show.
  // Keep the notifications for:
  //   • pending → confirmed  (your booking is locked in)
  //   • any     → cancelled  (your booking was cancelled)
  // (QA 2026-04-22 P2-#2).
  const newStatus = payload.status;
  if (newStatus && data && (newStatus === "confirmed" || newStatus === "cancelled")) {
    const { data: mappings } = await supabase
      .from("appointment_services")
      .select("service_id, sort_order")
      .eq("appointment_id", id)
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = (mappings || []).map((m: any) => m.service_id);
    const lookupIds = ids.length > 0 ? ids : [data.service_id];
    const { data: services } = await supabase.from("services").select("id, name").in("id", lookupIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byId = Object.fromEntries((services || []).map((s: any) => [s.id, s.name]));
    const serviceName = lookupIds.map((sid: string) => byId[sid]).filter(Boolean).join(", ") || "Your Service";
    const { data: stylist } = await supabase.from("stylists").select("name").eq("id", data.stylist_id).single();
    sendStatusChangeEmail({
      clientName: data.client_name,
      clientEmail: data.client_email,
      serviceName,
      stylistName: stylist?.name || "Your Stylist",
      date: data.date,
      startTime: data.start_time,
      newStatus,
      cancelToken: data.cancel_token,
      // Customer picked "Any Stylist" — show the neutral label in the
      // confirmation / cancellation email so they don't see a name they
      // didn't choose.
      anyStylist: data.requested_stylist === false,
    }).catch((err) => logError("status-email", err));

    // Parallel SMS, gated by the client having a phone + the admin
    // having SMS enabled globally + sms_booking_status_change_enabled.
    if (data.client_phone) {
      sendStatusChangeSMS({
        phone: data.client_phone,
        clientName: data.client_name,
        serviceName,
        date: data.date,
        time: data.start_time,
        newStatus,
        appointmentId: id,
        clientEmail: data.client_email,
      }).catch((err) => logError("status-sms", err));
    }

    // Stylist-targeted dashboard notification is off until stylist accounts
    // come back. Admins see every status change via the admin bell already.
  }

  return apiSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    logError("admin/appointments DELETE", error);
    return apiError("Failed to delete appointment.", 500);
  }

  logAdminAction("appointment.delete", JSON.stringify({ id }), id);

  return apiSuccess({ success: true });
}
