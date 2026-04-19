import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { sendBookingConfirmation, sendStaffNewBookingEmail } from "@/lib/email";
import { sendBookingConfirmationSMS } from "@/lib/sms";
import { checkRateLimit } from "@/lib/rateLimit";
import { appointmentCreateSchema } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { BOOKING, RATE_LIMITS } from "@/lib/constants";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { createNotification } from "@/lib/notifications";
import { getStaffNotificationEmails } from "@/lib/settings";
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

// Pick the first active stylist who can perform every selected service AND is
// available at the requested date/time. Used when the customer chose
// "Any Stylist". Returns null if nobody is free.
async function pickAnyStylist(
  serviceIds: string[],
  date: string,
  startTime: string,
): Promise<{ id: string; name: string } | null> {
  // All stylists who can perform the selected services.
  const { data: pairs, error: psErr } = await supabase
    .from("stylist_services")
    .select("stylist_id, service_id")
    .in("service_id", serviceIds);
  if (psErr || !pairs) return null;

  const counts = new Map<string, number>();
  for (const p of pairs as Array<{ stylist_id: string }>) {
    counts.set(p.stylist_id, (counts.get(p.stylist_id) || 0) + 1);
  }
  const stylistIds = [...counts.entries()]
    .filter(([, c]) => c >= serviceIds.length)
    .map(([id]) => id);
  if (stylistIds.length === 0) return null;

  const { data: stylists, error: sErr } = await supabase
    .from("stylists")
    .select("id, name, sort_order, active")
    .in("id", stylistIds)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (sErr || !stylists) return null;

  for (const s of stylists as Array<{ id: string; name: string }>) {
    if (s.id === BOOKING.ANY_STYLIST_ID) continue;
    const slots = await getAvailableSlots(s.id, serviceIds, date);
    if (slots.includes(startTime)) {
      return { id: s.id, name: s.name };
    }
  }
  return null;
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
    return apiError(parsed.error.issues[0]?.message || "Invalid booking request.", 400);
  }
  const {
    serviceId,
    serviceIds,
    stylistId: requestedStylistId,
    anyStylist,
    date,
    startTime,
    clientName,
    clientEmail,
    clientPhone,
    notes,
    depositPaymentIntentId,
    turnstileToken,
  } = parsed.data;

  // Normalize to an array; serviceIds takes precedence, fall back to single serviceId.
  const ids: string[] = serviceIds && serviceIds.length > 0 ? serviceIds : (serviceId ? [serviceId] : []);
  if (ids.length === 0) {
    return apiError("At least one service must be selected.", 400);
  }

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return apiError(turnstile.error || "Captcha verification failed.", 400);
  }

  if (!hasSupabaseConfig) {
    return apiError("Booking backend is not configured locally. Add Supabase env vars to enable real bookings.", 503);
  }

  // Resolve "Any Stylist" up-front so the rest of the flow uses a real id.
  const wantsAny = anyStylist === true || requestedStylistId === BOOKING.ANY_STYLIST_ID;
  let stylistId = requestedStylistId;
  let assignedStylistName: string | null = null;
  if (wantsAny) {
    const picked = await pickAnyStylist(ids, date, startTime);
    if (!picked) {
      return apiError("No stylist is available at that time. Please try a different slot.", 409);
    }
    stylistId = picked.id;
    assignedStylistName = picked.name;
  }

  // Verify the slot is still available across the combined duration.
  const available = await getAvailableSlots(stylistId, ids, date);
  if (!available.includes(startTime)) {
    return apiError("This time slot is no longer available. Please choose another.", 409);
  }

  // Fetch all chosen services, preserving selection order.
  const { data: servicesRaw, error: serviceError } = await supabase
    .from("services")
    .select("id, name, duration, price_text, price_min")
    .in("id", ids);
  if (serviceError || !servicesRaw || servicesRaw.length === 0) {
    return apiError("One or more services not found.", 404);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = new Map(servicesRaw.map((s: any) => [s.id, s]));
  const services = ids
    .map((id) => serviceMap.get(id))
    .filter(Boolean) as { id: string; name: string; duration: number; price_text: string; price_min: number }[];
  if (services.length !== ids.length) {
    return apiError("One or more services not found.", 404);
  }

  const totalDuration = services.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPriceMin = services.reduce((sum, s) => sum + (s.price_min || 0), 0);
  const endTime = minutesToTime(timeToMinutes(startTime) + totalDuration);

  const requiresDeposit = totalDuration >= BOOKING.DEPOSIT_TRIGGER_MINUTES;
  const depositRequired = requiresDeposit ? BOOKING.DEPOSIT_AMOUNT_CENTS : 0;
  const depositPaid = !!depositPaymentIntentId;

  if (requiresDeposit && !depositPaymentIntentId) {
    return apiError(
      `This appointment requires a $${BOOKING.DEPOSIT_AMOUNT_CENTS / 100} deposit before booking.`,
      402,
    );
  }

  const appointmentId = crypto.randomUUID();
  const cancelToken = crypto.randomUUID().replace(/-/g, "");

  const { error: insertError } = await supabase
    .from("appointments")
    .insert({
      id: appointmentId,
      service_id: services[0].id,
      stylist_id: stylistId,
      date,
      start_time: startTime,
      end_time: endTime,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      notes: notes || null,
      cancel_token: cancelToken,
      // All online bookings land as pending and require staff approval.
      status: "pending",
      requested_stylist: !wantsAny,
      policy_accepted_at: new Date().toISOString(),
      deposit_required_cents: depositRequired,
    });
  if (insertError) {
    logError("appointments POST", insertError);
    return apiError("Failed to create appointment.", 500);
  }

  // Mirror multi-service rows.
  if (services.length > 1) {
    const mappingRows = services.map((s, i) => ({
      appointment_id: appointmentId,
      service_id: s.id,
      sort_order: i,
    }));
    const { error: mappingError } = await supabase
      .from("appointment_services")
      .insert(mappingRows);
    if (mappingError) logError("appointments POST (services)", mappingError);
  }

  // Record the deposit if one was paid.
  if (depositPaid) {
    const { error: depositError } = await supabase.from("deposits").insert({
      appointment_id: appointmentId,
      amount: depositRequired,
      currency: "USD",
      stripe_payment_intent_id: depositPaymentIntentId,
      status: "succeeded",
    });
    if (depositError) logError("appointments POST (deposit)", depositError);
  }

  // Stylist name for email/notification.
  const { data: stylist } = await supabase
    .from("stylists")
    .select("name")
    .eq("id", stylistId)
    .single();
  const stylistName = (stylist?.name as string) || assignedStylistName || "Your Stylist";
  const serviceNamesCombined = services.map((s) => s.name).join(", ");
  const totalPriceText = `$${Math.round(totalPriceMin / 100)}`;

  // Client confirmation email (non-blocking).
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  sendBookingConfirmation({
    clientName,
    clientEmail,
    serviceName: serviceNamesCombined,
    stylistName,
    date,
    startTime,
    cancelUrl: `${baseUrl}/book/cancel?token=${cancelToken}`,
  }).catch(console.error);
  if (clientPhone) {
    sendBookingConfirmationSMS(clientPhone, clientName, serviceNamesCombined, date, startTime).catch(console.error);
  }

  // Staff email + in-dashboard notification (admins + assigned stylist).
  const staffEmails = await getStaffNotificationEmails();
  sendStaffNewBookingEmail({
    recipients: staffEmails,
    clientName,
    clientEmail,
    clientPhone: clientPhone || null,
    serviceName: serviceNamesCombined,
    stylistName,
    date,
    startTime,
    endTime,
    totalPriceText,
    notes: notes || null,
    requestedStylist: !wantsAny,
    depositRequiredCents: depositRequired,
    depositPaid,
    approveUrl: `${baseUrl}/admin/appointments?focus=${appointmentId}`,
  }).catch(console.error);

  await createNotification({
    toAllAdmins: true,
    type: "booking.new",
    title: `New booking: ${clientName}`,
    body: `${serviceNamesCombined} with ${stylistName} on ${date} at ${startTime}` +
      (wantsAny ? " (Any Stylist)" : "") +
      (depositRequired > 0 ? ` · Deposit $${depositRequired / 100} ${depositPaid ? "PAID" : "REQUIRED"}` : ""),
    appointmentId,
    url: `/admin/appointments?focus=${appointmentId}`,
  });
  await createNotification({
    toStylistId: stylistId,
    type: "booking.new",
    title: `New booking: ${clientName}`,
    body: `${serviceNamesCombined} on ${date} at ${startTime}`,
    appointmentId,
    url: `/admin/appointments?focus=${appointmentId}`,
  });

  return apiSuccess({
    id: appointmentId,
    services: services.map((s) => ({ id: s.id, name: s.name })),
    stylist: stylistName,
    date,
    startTime,
    endTime,
    status: "pending",
    requestedStylist: !wantsAny,
    depositRequiredCents: depositRequired,
    depositPaid,
  });
}
