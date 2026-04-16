import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminAppointmentPatchSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sendStatusChangeEmail } from "@/lib/email";
import { sendStatusChangeSms, hasTwilioConfig } from "@/lib/sms";
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

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logError("admin/appointments PATCH", error);
    return apiError("Failed to update appointment.", 500);
  }

  logAdminAction("appointment.update", JSON.stringify(payload), id);

  // Send email notification on status change
  if (payload.status && data) {
    const { data: service } = await supabase.from("services").select("name").eq("id", data.service_id).single();
    const { data: stylist } = await supabase.from("stylists").select("name").eq("id", data.stylist_id).single();
    sendStatusChangeEmail({
      clientName: data.client_name,
      clientEmail: data.client_email,
      serviceName: service?.name || "Your Service",
      stylistName: stylist?.name || "Your Stylist",
      date: data.date,
      startTime: data.start_time,
      newStatus: payload.status,
      cancelToken: data.cancel_token,
    }).catch((err) => logError("status-email", err));

    // Send SMS notification on status change
    if (data.client_phone && hasTwilioConfig) {
      sendStatusChangeSms({
        clientName: data.client_name,
        clientPhone: data.client_phone,
        serviceName: service?.name || "Your Service",
        date: data.date,
        startTime: data.start_time,
        newStatus: payload.status,
      }).catch((err) => logError("status-sms", err));
    }
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
