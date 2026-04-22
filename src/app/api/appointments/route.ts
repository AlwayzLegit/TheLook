import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { sendBookingConfirmation, sendStaffNewBookingEmail } from "@/lib/email";
import { sendBookingConfirmationSMS, sendStaffNewBookingSMS } from "@/lib/sms";
import { checkRateLimit } from "@/lib/rateLimit";
import { appointmentCreateSchema } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { BOOKING, RATE_LIMITS } from "@/lib/constants";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { createNotification } from "@/lib/notifications";
import { getStaffNotificationEmails, getStaffNotificationSmsNumbers } from "@/lib/settings";
import { computeRequiredDeposit } from "@/lib/depositRules";
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
    // Bubble *safe* validation messages (policy / phone) but swallow any
    // low-level language (like "Invalid id.") that the customer shouldn't
    // have to parse. Everything a user can actually fix begins with one of
    // the allow-listed prefixes.
    const msg = parsed.error.issues[0]?.message || "";
    const safe = /^(Phone|You must|Invalid booking)/i.test(msg)
      ? msg
      : "We couldn't confirm this booking. Please refresh and try again, or call us at (818) 662-5665.";
    return apiError(safe, 400);
  }
  const {
    serviceId,
    serviceIds,
    variantIds,
    stylistId: requestedStylistId,
    anyStylist,
    date,
    startTime,
    clientName,
    clientEmail,
    clientPhone,
    notes,
    smsConsent,
    depositPaymentIntentId,
    turnstileToken,
  } = parsed.data;

  // Normalize to an array; serviceIds takes precedence, fall back to single serviceId.
  const ids: string[] = serviceIds && serviceIds.length > 0 ? serviceIds : (serviceId ? [serviceId] : []);
  if (ids.length === 0) {
    return apiError("At least one service must be selected.", 400);
  }

  // Normalize variantIds to align by index with ids; empty string means "no
  // variant picked for this service".
  const vIds: (string | null)[] = ids.map((_, i) => {
    const raw = variantIds?.[i];
    return raw && raw.length > 0 ? raw : null;
  });

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return apiError(turnstile.error || "Captcha verification failed.", 400);
  }

  if (!hasSupabaseConfig) {
    return apiError("Booking backend is not configured locally. Add Supabase env vars to enable real bookings.", 503);
  }

  // Refuse bookings from banned clients. The /admin/clients UI lets staff
  // toggle a client's banned flag + reason; the booking form surfaces a
  // generic "call us" message so we don't broadcast why.
  try {
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("banned")
      .eq("email", clientEmail.toLowerCase())
      .maybeSingle();
    if (profile?.banned) {
      return apiError(
        "We're unable to book this appointment online. Please call the salon at (818) 662-5665.",
        403,
      );
    }
  } catch {
    // Pre-migration profiles have no banned column — fall through.
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

  // Fetch any picked variants so duration/price come from the variant, not
  // the parent service (Facial Hair Removal — Brow vs Full Face etc.).
  const pickedVariantIds = vIds.filter((v): v is string => v !== null);
  const variantsById = new Map<string, { id: string; service_id: string; name: string; duration: number; price_min: number; price_text: string }>();
  if (pickedVariantIds.length > 0) {
    const { data: vrows, error: vErr } = await supabase
      .from("service_variants")
      .select("id, service_id, name, duration, price_min, price_text")
      .in("id", pickedVariantIds)
      .eq("active", true);
    if (vErr) logError("appointments POST (variants)", vErr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const v of (vrows || []) as any[]) variantsById.set(v.id, v);
    // Validate every picked variant belongs to the paired service id.
    for (let i = 0; i < ids.length; i++) {
      const vid = vIds[i];
      if (!vid) continue;
      const v = variantsById.get(vid);
      if (!v || v.service_id !== ids[i]) {
        return apiError("Selected variant doesn't match the service.", 400);
      }
    }
  }

  // Compute effective duration + price using variants where provided.
  const effective = services.map((s, i) => {
    const vid = vIds[i];
    const v = vid ? variantsById.get(vid) : null;
    return {
      service: s,
      variantId: v?.id ?? null,
      displayName: v ? `${s.name} — ${v.name}` : s.name,
      duration: v?.duration ?? s.duration,
      priceMin: v?.price_min ?? s.price_min,
    };
  });

  const totalDuration = effective.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalPriceMin = effective.reduce((sum, e) => sum + (e.priceMin || 0), 0);
  const endTime = minutesToTime(timeToMinutes(startTime) + totalDuration);

  // Verify the slot is still available using the variant-aware total
  // duration. We deliberately run this AFTER computing totalDuration so
  // Brow+Lip (10+10=20) isn't approved against the parent service's 10-min
  // duration.
  const available = await getAvailableSlots(stylistId, ids, date, totalDuration);
  if (!available.includes(startTime)) {
    return apiError("This time slot is no longer available. Please choose another.", 409);
  }

  const depositCalc = await computeRequiredDeposit({
    totalPriceCents: totalPriceMin,
    totalDurationMinutes: totalDuration,
  });
  const requiresDeposit = depositCalc.requiresDeposit;
  const depositRequired = depositCalc.depositCents;
  const depositPaid = !!depositPaymentIntentId;

  if (requiresDeposit && !depositPaymentIntentId) {
    return apiError(
      `This appointment requires a $${(depositRequired / 100).toFixed(0)} deposit before booking.`,
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
      sms_consent: !!smsConsent,
      sms_consent_at: smsConsent ? new Date().toISOString() : null,
    });
  if (insertError) {
    logError("appointments POST", insertError);
    return apiError("Failed to create appointment.", 500);
  }

  // Mirror multi-service rows — always insert so variant_id is recorded
  // even on single-service bookings. price_min + duration are
  // snapshotted here so historical revenue can't drift when a service's
  // price is edited later (migration 20260430).
  //
  // Historical bug (QA 2026-04-22 P1-#1): this insert used to swallow
  // its error silently and let the route return 200, leaving
  // appointments with no appointment_services rows — which in turn
  // broke every downstream revenue calc. Now we compensate by
  // deleting the just-inserted appointment and surfacing the actual
  // Postgres message so the operator can diagnose.
  const mappingRows = effective.map((e, i) => ({
    appointment_id: appointmentId,
    service_id: e.service.id,
    variant_id: e.variantId,
    sort_order: i,
    price_min: e.priceMin,
    duration: e.duration,
  }));
  const { error: mappingError } = await supabase
    .from("appointment_services")
    .insert(mappingRows);
  if (mappingError) {
    logError("appointments POST (services)", mappingError);
    // Roll back the parent appointment so we don't leave an orphan.
    // Best-effort — if the delete itself errors, we still surface the
    // original mappingError to the client.
    await supabase.from("appointments").delete().eq("id", appointmentId).then(
      () => {},
      (e: unknown) => logError("appointments POST (services rollback)", e),
    );
    return apiError(
      `Failed to save appointment services: ${mappingError.message || "unknown"}`,
      500,
    );
  }

  // Record the deposit if one was paid. Two writes:
  //   1. legacy `deposits` row (kept while older admin reads depend on it)
  //   2. unified `charges` row (new canonical ledger — includes card brand
  //      / last4 / customer id so the admin can audit at a glance).
  // Also: look up the Stripe customer + payment method for this intent and
  // cache it on the appointment so the cancellation-fee flow can charge
  // off-session later without another Stripe round-trip.
  if (depositPaid && depositPaymentIntentId) {
    const { lookupPaymentMethodFromIntent } = await import("@/lib/stripe");
    const pmInfo = await lookupPaymentMethodFromIntent(depositPaymentIntentId);

    await supabase.from("deposits").insert({
      appointment_id: appointmentId,
      amount: depositRequired,
      currency: "USD",
      stripe_payment_intent_id: depositPaymentIntentId,
      status: "succeeded",
    });

    // Resolve Stripe customer for this email so we can stamp it on the
    // appointment + client profile.
    let stripeCustomerId: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("client_profiles")
        .select("stripe_customer_id")
        .eq("email", clientEmail.toLowerCase())
        .maybeSingle();
      stripeCustomerId = (prof?.stripe_customer_id as string) || null;
    } catch {
      // fall through
    }

    // Upsert appointment-level cache so we have everything we need to
    // charge without extra Stripe calls later.
    await supabase
      .from("appointments")
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_payment_method_id: pmInfo.paymentMethodId,
        card_brand: pmInfo.cardBrand,
        card_last4: pmInfo.cardLast4,
      })
      .eq("id", appointmentId);

    // Unified charges row — upsert in case /api/deposits already wrote a
    // pending row for the same intent id.
    await supabase.from("charges").upsert({
      appointment_id: appointmentId,
      client_email: clientEmail,
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: depositPaymentIntentId,
      type: "deposit",
      amount: depositRequired,
      currency: "USD",
      status: "succeeded",
      card_brand: pmInfo.cardBrand,
      card_last4: pmInfo.cardLast4,
      reason: "Booking deposit",
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_payment_intent_id" });

    // Ensure the client profile exists with the stripe_customer_id cached.
    if (stripeCustomerId) {
      await supabase
        .from("client_profiles")
        .upsert({
          email: clientEmail.toLowerCase(),
          name: clientName,
          phone: clientPhone || null,
          stripe_customer_id: stripeCustomerId,
        }, { onConflict: "email" });
    }
  }

  // B-21: unconditional client_profiles upsert. Every confirmed booking
  // should produce / refresh a profile row so admins have a single client
  // directory keyed on email. The deposit + setup-intent branches above
  // already populated stripe_customer_id where applicable; this just
  // ensures name + phone are kept fresh and the row exists at all for
  // bookings without a card capture.
  // When the client opted in, mirror that onto their profile (with the
  // timestamp) so anywhere we consult client_profiles for marketing can
  // honour the flag. We never clear consent from an upsert — previous
  // opt-ins stand until the client replies STOP.
  const profileRow: Record<string, unknown> = {
    email: clientEmail.toLowerCase(),
    name: clientName,
    phone: clientPhone || null,
  };
  if (smsConsent) {
    profileRow.sms_consent = true;
    profileRow.sms_consent_at = new Date().toISOString();
  }
  await supabase
    .from("client_profiles")
    .upsert(profileRow, { onConflict: "email", ignoreDuplicates: false })
    .then(
      () => {},
      (err: unknown) => logError("appointments POST (profile upsert)", err),
    );

  // Stylist name for email/notification.
  const { data: stylist } = await supabase
    .from("stylists")
    .select("name")
    .eq("id", stylistId)
    .single();
  const stylistName = (stylist?.name as string) || assignedStylistName || "Your Stylist";
  const serviceNamesCombined = effective.map((e) => e.displayName).join(", ");
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
    anyStylist: wantsAny,
  }).catch(console.error);
  if (clientPhone) {
    sendBookingConfirmationSMS(
      clientPhone,
      clientName,
      serviceNamesCombined,
      date,
      startTime,
      appointmentId,
      clientEmail,
    ).catch(console.error);
  }

  // Fan out staff SMS alerts in parallel with the email.
  const staffSmsNumbers = await getStaffNotificationSmsNumbers();
  for (const number of staffSmsNumbers) {
    sendStaffNewBookingSMS({
      phone: number,
      clientName,
      serviceName: serviceNamesCombined,
      date,
      time: startTime,
      appointmentId,
    }).catch(console.error);
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
  // Per-stylist notification is skipped while stylist accounts are off —
  // admins see everything via the bell above. Restore the per-stylist
  // notification when stylist logins come back.

  return apiSuccess({
    id: appointmentId,
    services: effective.map((e) => ({
      id: e.service.id,
      name: e.displayName,
      variantId: e.variantId,
    })),
    stylist: stylistName,
    date,
    startTime,
    endTime,
    status: "pending",
    requestedStylist: !wantsAny,
    anyStylist: wantsAny,
    depositRequiredCents: depositRequired,
    depositPaid,
  });
}
