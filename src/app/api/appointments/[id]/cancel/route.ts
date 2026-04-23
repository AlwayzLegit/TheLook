import { supabase } from "@/lib/supabase";
import { sendCancellationEmail } from "@/lib/email";
import { sendCancellationSMS } from "@/lib/sms";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");

  if (!token) {
    return apiError("Cancel token required.", 400);
  }

  const { data: appointment, error: findError } = await supabase
    .from("appointments")
    .select("*")
    .eq("cancel_token", token)
    .single();

  if (findError || !appointment) {
    return apiError("Invalid cancel token.", 404);
  }

  if (appointment.status === "cancelled") {
    return apiSuccess({ message: "Already cancelled" });
  }

  // Use .select().single() after the update so an RLS-blocked write
  // surfaces as an empty result instead of a silent no-op. Previously a
  // missing / misconfigured service-role key could let this endpoint
  // return 200 "cancelled" while the DB row stayed "confirmed" — the
  // admin calendar then kept showing the stale status indefinitely.
  const { data: updated, error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", appointment.id)
    .select("id, status")
    .single();

  if (updateError || !updated || updated.status !== "cancelled") {
    logError("appointments/cancel POST", updateError || { message: "update did not persist" });
    return apiError("Failed to cancel appointment.", 500);
  }

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", appointment.service_id)
    .single();

  const { data: stylist } = await supabase
    .from("stylists")
    .select("*")
    .eq("id", appointment.stylist_id)
    .single();

  sendCancellationEmail({
    clientName: appointment.client_name,
    clientEmail: appointment.client_email,
    serviceName: service?.name || "Your Service",
    stylistName: stylist?.name || "Your Stylist",
    date: appointment.date,
    startTime: appointment.start_time,
  }).catch((err) => logError("appointments/cancel email", err));

  if (appointment.client_phone) {
    sendCancellationSMS({
      phone: appointment.client_phone,
      clientName: appointment.client_name,
      serviceName: service?.name || "Your Service",
      date: appointment.date,
      time: appointment.start_time,
      appointmentId: appointment.id,
      clientEmail: appointment.client_email,
    }).catch((err) => logError("appointments/cancel sms", err));
  }

  return apiSuccess({ message: "Appointment cancelled" });
}
