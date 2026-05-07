import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { sendStatusChangeEmail } from "@/lib/email";
import { sendRescheduleSMS } from "@/lib/sms";
import {
  cancelTokenSchema,
  RESCHEDULABLE_STATUSES,
  rescheduleSchema,
} from "@/lib/validation";
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
  const tokenParse = cancelTokenSchema.safeParse(searchParams.get("token"));
  if (!tokenParse.success) return apiError("Invalid or expired link.", 400);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("cancel_token", tokenParse.data)
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }
  const parsed = rescheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request.", 400);
  }
  const { token, newDate, newStartTime } = parsed.data;

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("cancel_token", token)
    .single();

  if (!appointment) return apiError("Invalid link.", 404);
  // Whitelist instead of blacklist — anything outside pending/confirmed
  // (e.g. "no_show", or future statuses we add) shouldn't be moveable.
  if (!(RESCHEDULABLE_STATUSES as readonly string[]).includes(appointment.status)) {
    return apiError("Cannot reschedule this appointment.", 400);
  }

  // Pre-flight availability check for nicer errors when the slot is
  // outside business hours. The partial unique index on
  // (stylist_id, date, start_time) WHERE status<>'cancelled' is the
  // race-safety net — see the 23505 catch on the UPDATE below.
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
    // 23505 from the appointments_active_slot_idx means a concurrent
    // booking grabbed this slot between getAvailableSlots() and the
    // UPDATE. Surface the same 409 the pre-check returns.
    if (error.code === "23505") {
      return apiError("That slot is no longer available. Please pick another.", 409);
    }
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
    anyStylist: appointment.requested_stylist === false,
  }).catch((err) => logError("reschedule email", err));

  if (appointment.client_phone) {
    sendRescheduleSMS({
      phone: appointment.client_phone,
      clientName: appointment.client_name,
      serviceName: service.name,
      date: newDate,
      time: newStartTime,
      appointmentId: appointment.id,
      clientEmail: appointment.client_email,
    }).catch((err) => logError("reschedule sms", err));
  }

  return apiSuccess({ success: true, newDate, newStartTime, newEndTime });
}
