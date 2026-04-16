import { supabase } from "@/lib/supabase";
import { sendCancellationEmail } from "@/lib/email";
import { sendCancellationSms, hasTwilioConfig } from "@/lib/sms";
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

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", appointment.id);

  if (updateError) {
    logError("appointments/cancel POST", updateError);
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

  // Send cancellation SMS if phone is on file
  if (appointment.client_phone && hasTwilioConfig) {
    sendCancellationSms({
      clientName: appointment.client_name,
      clientPhone: appointment.client_phone,
      serviceName: service?.name || "Your Service",
      stylistName: stylist?.name || "Your Stylist",
      date: appointment.date,
      startTime: appointment.start_time,
    }).catch((err) => logError("appointments/cancel sms", err));
  }

  return apiSuccess({ message: "Appointment cancelled" });
}
