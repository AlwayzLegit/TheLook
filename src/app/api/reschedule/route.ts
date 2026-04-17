import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { sendStatusChangeEmail } from "@/lib/email";
import { NextRequest } from "next/server";

function minToTime(m: number) {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// GET: validate token and return appointment details
export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Not available.", 503);

  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  if (!token) return apiError("Token required.", 400);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("cancel_token", token)
    .single();

  if (!appointment) return apiError("Invalid or expired link.", 404);
  if (appointment.status === "cancelled") return apiError("This appointment has been cancelled.", 400);
  if (appointment.status === "completed") return apiError("This appointment has already been completed.", 400);

  const { data: service } = await supabase.from("services").select("name, duration, price_min").eq("id", appointment.service_id).single();
  const { data: stylist } = await supabase.from("stylists").select("name").eq("id", appointment.stylist_id).single();

  return apiSuccess({
    id: appointment.id,
    serviceId: appointment.service_id,
    stylistId: appointment.stylist_id,
    date: appointment.date,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
    clientName: appointment.client_name,
    serviceName: service?.name,
    stylistName: stylist?.name,
    duration: service?.duration,
  });
}

// POST: reschedule the appointment
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Not available.", 503);

  const body = await request.json();
  const { token, newDate, newStartTime } = body;

  if (!token || !newDate || !newStartTime) {
    return apiError("Token, date, and time are required.", 400);
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("cancel_token", token)
    .single();

  if (!appointment) return apiError("Invalid link.", 404);
  if (appointment.status === "cancelled" || appointment.status === "completed") {
    return apiError("Cannot reschedule this appointment.", 400);
  }

  // Check availability
  const slots = await getAvailableSlots(appointment.stylist_id, appointment.service_id, newDate);
  if (!slots.includes(newStartTime)) {
    return apiError("That slot is no longer available. Please pick another.", 409);
  }

  const { data: service } = await supabase.from("services").select("duration, name").eq("id", appointment.service_id).single();
  if (!service) return apiError("Service not found.", 404);

  const newEndTime = minToTime(timeToMin(newStartTime) + service.duration);

  const { error } = await supabase
    .from("appointments")
    .update({
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      reminder_sent: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointment.id);

  if (error) {
    logError("reschedule POST", error);
    return apiError("Failed to reschedule.", 500);
  }

  // Send confirmation email
  const { data: stylist } = await supabase.from("stylists").select("name").eq("id", appointment.stylist_id).single();
  sendStatusChangeEmail({
    clientName: appointment.client_name,
    clientEmail: appointment.client_email,
    serviceName: service.name,
    stylistName: stylist?.name || "Your Stylist",
    date: newDate,
    startTime: newStartTime,
    newStatus: "confirmed",
    cancelToken: appointment.cancel_token,
  }).catch((err) => logError("reschedule email", err));

  return apiSuccess({ success: true, newDate, newStartTime, newEndTime });
}
