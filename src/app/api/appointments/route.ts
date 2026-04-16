import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/email";
import { sendBookingConfirmationSms, hasTwilioConfig } from "@/lib/sms";
import { checkRateLimit } from "@/lib/rateLimit";
import { appointmentCreateSchema } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { RATE_LIMITS } from "@/lib/constants";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({
    key: `book:${ip}`,
    limit: RATE_LIMITS.BOOKING.limit,
    windowMs: RATE_LIMITS.BOOKING.windowMs,
  });
  if (!rl.ok) {
    return apiError("Too many booking attempts. Please wait a few minutes and try again.", 429);
  }

  const body = await request.json();
  const parsed = appointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid booking request.", 400);
  }
  const {
    serviceId,
    stylistId,
    date,
    startTime,
    clientName,
    clientEmail,
    clientPhone,
    notes,
    turnstileToken,
  } = parsed.data;

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return apiError(turnstile.error || "Captcha verification failed.", 400);
  }

  if (!hasSupabaseConfig) {
    return apiError("Booking backend is not configured locally. Add Supabase env vars to enable real bookings.", 503);
  }

  // Verify the slot is still available (prevent double-booking)
  const available = await getAvailableSlots(stylistId, serviceId, date);
  if (!available.includes(startTime)) {
    return apiError("This time slot is no longer available. Please choose another.", 409);
  }

  // Get service duration to calculate end time
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return apiError("Service not found.", 404);
  }

  const endTime = minutesToTime(timeToMinutes(startTime) + service.duration);
  const appointmentId = crypto.randomUUID();
  const cancelToken = crypto.randomUUID().replace(/-/g, "");

  // Create appointment
  const { error: insertError } = await supabase
    .from("appointments")
    .insert({
      id: appointmentId,
      service_id: serviceId,
      stylist_id: stylistId,
      date,
      start_time: startTime,
      end_time: endTime,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      notes: notes || null,
      cancel_token: cancelToken,
      status: "confirmed",
    });

  if (insertError) {
    logError("appointments POST", insertError);
    return apiError("Failed to create appointment.", 500);
  }

  // Get stylist name for email
  const { data: stylist } = await supabase
    .from("stylists")
    .select("*")
    .eq("id", stylistId)
    .single();

  // Send confirmation email (non-blocking)
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  sendBookingConfirmation({
    clientName,
    clientEmail,
    serviceName: service.name,
    stylistName: stylist?.name || "Your Stylist",
    date,
    startTime,
    cancelUrl: `${baseUrl}/book/cancel?token=${cancelToken}`,
  }).catch(console.error);

  // Send confirmation SMS if phone provided and Twilio is configured
  if (clientPhone && hasTwilioConfig) {
    sendBookingConfirmationSms({
      clientName,
      clientPhone,
      serviceName: service.name,
      stylistName: stylist?.name || "Your Stylist",
      date,
      startTime,
    }).catch(console.error);
  }

  return apiSuccess({
    id: appointmentId,
    service: service.name,
    stylist: stylist?.name,
    date,
    startTime,
    endTime,
    status: "confirmed",
  });
}
