import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { appointmentCreateSchema } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { NextRequest, NextResponse } from "next/server";

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
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = appointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
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
    return NextResponse.json({ error: turnstile.error }, { status: 400 });
  }

  if (!hasSupabaseConfig) {
    return NextResponse.json(
      { error: "Booking backend is not configured locally. Add Supabase env vars to enable real bookings." },
      { status: 503 }
    );
  }

  // Verify the slot is still available (prevent double-booking)
  const available = await getAvailableSlots(stylistId, serviceId, date);
  if (!available.includes(startTime)) {
    return NextResponse.json(
      { error: "This time slot is no longer available. Please choose another." },
      { status: 409 }
    );
  }

  // Get service duration to calculate end time
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
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
    console.error("Error creating appointment:", insertError);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
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

  return NextResponse.json({
    id: appointmentId,
    service: service.name,
    stylist: stylist?.name,
    date,
    startTime,
    endTime,
    status: "confirmed",
  });
}
