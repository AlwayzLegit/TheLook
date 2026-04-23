import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { createDepositIntent, isStripeEnabled } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { NextRequest } from "next/server";

// Compute the credit-card processing surcharge on top of the deposit
// base. Admin sets the percentage in /admin/settings → Booking. Clamped
// to [0, 10]% for safety — anything higher likely indicates a typo.
async function computeCcFee(baseCents: number): Promise<number> {
  const raw = await getSetting("deposit_cc_fee_pct").catch(() => null);
  const n = raw ? parseFloat(String(raw)) : 0;
  const pct = Number.isFinite(n) && n > 0 && n <= 10 ? n : 0;
  if (pct === 0) return 0;
  return Math.round(baseCents * pct / 100);
}

// Create a Stripe PaymentIntent for an appointment deposit.
//
// Modes:
//   1. Pre-booking — no appointmentId yet, caller passes clientEmail/name/phone.
//      Returns clientSecret + paymentIntentId + customerId so the booking page
//      can confirm the card on the Stripe Elements form, then include the
//      paymentIntentId + customerId in the subsequent POST /api/appointments.
//   2. Post-booking — caller passes appointmentId. We resolve customer from
//      the appointment's client_email and save the deposit row immediately.
//
// Both modes now attach the card to a Stripe Customer with
// setup_future_usage='off_session' so the cancellation-fee flow can charge
// it later without the client re-entering card details.
export async function POST(request: NextRequest) {
  if (!isStripeEnabled()) return apiError("Payments not configured.", 503);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  const { appointmentId, amountCents, clientEmail, clientName, clientPhone, description } = body as {
    appointmentId?: string;
    amountCents?: number;
    clientEmail?: string;
    clientName?: string;
    clientPhone?: string;
    description?: string;
  };

  if (!amountCents || amountCents <= 0) {
    return apiError("amountCents required.", 400);
  }

  // Compute the CC surcharge and charge the customer deposit + fee. Both
  // values are captured in metadata so the appointment-side logic can
  // still credit the original deposit base to the service total while
  // the processing fee stays with us.
  const feeCents = await computeCcFee(amountCents);
  const totalCents = amountCents + feeCents;

  let emailForStripe: string | null = null;
  let nameForStripe: string | undefined = clientName;
  let phoneForStripe: string | undefined = clientPhone;
  const metadata: Record<string, string> = {
    reason: "deposit",
    deposit_base_cents: String(amountCents),
    cc_fee_cents: String(feeCents),
    charged_total_cents: String(totalCents),
  };

  if (appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, client_email, client_name, client_phone")
      .eq("id", appointmentId)
      .single();
    if (!appointment) return apiError("Appointment not found.", 404);
    emailForStripe = (appointment.client_email as string) || null;
    nameForStripe = nameForStripe || (appointment.client_name as string | undefined);
    phoneForStripe = phoneForStripe || (appointment.client_phone as string | undefined);
    metadata.appointmentId = appointmentId;
  } else {
    if (!clientEmail) return apiError("clientEmail required when appointmentId is absent.", 400);
    emailForStripe = clientEmail;
    metadata.preBooking = "true";
    metadata.description = description || "";
  }

  if (!emailForStripe) return apiError("Missing client email.", 400);

  let intent;
  try {
    intent = await createDepositIntent(
      totalCents,
      emailForStripe,
      nameForStripe,
      phoneForStripe,
      metadata,
    );
  } catch (err) {
    // Guard-thrown config errors (e.g. pk_ in STRIPE_SECRET_KEY) arrive
    // here — surface the real message instead of a generic 500.
    logError("api/deposits", err);
    return apiError(
      err instanceof Error ? err.message : "Deposit form failed to initialize.",
      500,
    );
  }
  if (intent.error) return apiError(intent.error, 500);

  // Record the charge row eagerly so admins can see the attempt even if
  // the card never completes. Webhook/appointments-POST flip this to
  // 'succeeded' later. Skipped in pre-booking mode because there's no
  // appointment yet.
  if (appointmentId && intent.id) {
    const chargeReason = feeCents > 0
      ? `Booking deposit ($${(amountCents / 100).toFixed(2)} + $${(feeCents / 100).toFixed(2)} CC fee)`
      : "Booking deposit";
    const { error: chargeErr } = await supabase.from("charges").insert({
      appointment_id: appointmentId,
      client_email: emailForStripe,
      stripe_customer_id: intent.customerId,
      stripe_payment_intent_id: intent.id,
      type: "deposit",
      amount: totalCents,
      currency: "USD",
      status: "pending",
      reason: chargeReason,
    });
    if (chargeErr) logError("deposits POST (charges insert)", chargeErr);

    // Legacy deposits table — keep writing so the older admin read paths
    // keep working until we phase them out.
    await supabase.from("deposits").insert({
      appointment_id: appointmentId,
      amount: totalCents,
      stripe_payment_intent_id: intent.id,
      status: "pending",
    });
  }

  // Persist the Stripe customer on the client profile if we know the email.
  // Skipped when no profile row exists yet (most first-time bookings).
  if (emailForStripe && intent.customerId) {
    await supabase
      .from("client_profiles")
      .update({ stripe_customer_id: intent.customerId })
      .eq("email", emailForStripe.toLowerCase())
      .then(() => {}, () => { /* non-critical; profile may not exist yet */ });
  }

  return apiSuccess({
    clientSecret: intent.clientSecret,
    paymentIntentId: intent.id,
    customerId: intent.customerId,
    // Breakdown so the booking UI can show the final total without a
    // second round-trip. The client already had amountCents; we echo it
    // back plus feeCents + totalCents for clarity.
    depositBaseCents: amountCents,
    ccFeeCents: feeCents,
    chargedTotalCents: totalCents,
  });
}
