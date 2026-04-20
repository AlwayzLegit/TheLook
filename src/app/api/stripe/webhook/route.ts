import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, logError } from "@/lib/apiResponse";

// Stripe webhook: keeps our `charges` table in sync with what actually
// happened on Stripe, and stamps appointment-level card-on-file metadata
// once a deposit PaymentIntent actually succeeds.
//
// Events handled:
//   payment_intent.succeeded        — deposit or fee cleared
//   payment_intent.payment_failed   — card declined / expired / etc.
//   charge.refunded                 — salon or Stripe reversed a charge
//
// Set STRIPE_WEBHOOK_SECRET in Vercel env vars and add this route's URL
// to the Stripe dashboard webhook endpoints.
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return apiError("Webhook not configured.", 503);
  }

  const rawBody = await request.text();

  // Dynamic import so Stripe isn't in the Edge bundle.
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-11-20.acacia" as any,
  });

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    logError("stripe webhook (signature)", err);
    return apiError("Invalid signature.", 400);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
        await handleIntentSucceeded(intent);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
        await handleIntentFailed(intent);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as import("stripe").Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        // Non-fatal; Stripe retries on 4xx/5xx so acknowledge unknown events.
        break;
    }
  } catch (err) {
    logError(`stripe webhook (${event.type})`, err);
    // Still 200 so Stripe doesn't retry-storm on bugs in our handler.
    // The error is logged for us to investigate.
  }

  return NextResponse.json({ received: true });
}

async function handleIntentSucceeded(intent: import("stripe").Stripe.PaymentIntent) {
  // Pull card metadata so we can stamp brand/last4 on the charge row.
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let paymentMethodId: string | null = null;
  if (typeof intent.payment_method === "string") {
    paymentMethodId = intent.payment_method;
  } else if (intent.payment_method && "id" in intent.payment_method) {
    paymentMethodId = intent.payment_method.id;
    if (intent.payment_method.card) {
      cardBrand = intent.payment_method.card.brand;
      cardLast4 = intent.payment_method.card.last4;
    }
  }

  // Flip the pending charge row to succeeded — or upsert one if the deposit
  // flow never wrote it (pre-booking mode).
  await supabase.from("charges").upsert({
    stripe_payment_intent_id: intent.id,
    stripe_customer_id: typeof intent.customer === "string"
      ? intent.customer
      : intent.customer?.id ?? null,
    client_email: intent.metadata?.clientEmail ?? null,
    appointment_id: intent.metadata?.appointmentId ?? null,
    type: intent.metadata?.reason === "deposit"
      ? "deposit"
      : intent.metadata?.reason?.includes("fee") ? "cancellation_fee" : "manual",
    amount: intent.amount,
    currency: (intent.currency || "USD").toUpperCase(),
    status: "succeeded",
    card_brand: cardBrand,
    card_last4: cardLast4,
    reason: intent.description || intent.metadata?.reason || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_payment_intent_id" });

  // If this is a deposit for a known appointment, also stamp the card-on-
  // file columns so the admin UI can show them immediately.
  const apptId = intent.metadata?.appointmentId;
  if (apptId && paymentMethodId) {
    await supabase
      .from("appointments")
      .update({
        stripe_customer_id: typeof intent.customer === "string" ? intent.customer : null,
        stripe_payment_method_id: paymentMethodId,
        card_brand: cardBrand,
        card_last4: cardLast4,
      })
      .eq("id", apptId);
  }
}

async function handleIntentFailed(intent: import("stripe").Stripe.PaymentIntent) {
  const reason =
    intent.last_payment_error?.message ||
    intent.last_payment_error?.code ||
    "Payment failed";
  await supabase
    .from("charges")
    .update({
      status: "failed",
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", intent.id);
}

async function handleChargeRefunded(charge: import("stripe").Stripe.Charge) {
  if (!charge.payment_intent) return;
  const intentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent.id;
  await supabase
    .from("charges")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", intentId);
}
