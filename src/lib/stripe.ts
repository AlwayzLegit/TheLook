/**
 * Stripe integration — deposit collection.
 *
 * Flow:
 *   1. Bookings whose total price exceeds DEPOSIT_TRIGGER_PRICE_CENTS
 *      require a $50 deposit up-front. We create a Stripe Customer (per
 *      client email) and a PaymentIntent with
 *      `setup_future_usage: "off_session"`. The charge collects the deposit
 *      AND saves the card on the Customer as a side-effect.
 *   2. After the intent succeeds, the webhook + the booking POST record
 *      the card's brand/last4 on the appointment so admins can see it.
 *   3. chargeOffSession() + the admin /charge-fee route remain available
 *      as a manual escape hatch in case the salon ever needs to collect
 *      additional off-session charges on a saved card. The standard
 *      no-show / late-cancel flow forfeits the deposit instead.
 *
 * Stripe itself stores the card; we never touch raw PAN data.
 */

import type Stripe from "stripe";

export function isStripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

async function getStripe(): Promise<Stripe | null> {
  if (!isStripeEnabled()) return null;
  const key = process.env.STRIPE_SECRET_KEY!;
  // Loud guard: if someone pasted the publishable key (pk_...) into
  // STRIPE_SECRET_KEY by mistake, every server-side Stripe call fails with
  // "This API call cannot be made with a publishable API key." Surface that
  // as a clear config error instead of a raw Stripe error.
  if (!key.startsWith("sk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY is misconfigured — it must start with 'sk_'. " +
      "Check Vercel env vars: STRIPE_SECRET_KEY should be your secret key " +
      "(sk_live_... or sk_test_...), and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY " +
      "should be the publishable key (pk_live_... or pk_test_...).",
    );
  }
  const { default: StripeSdk } = await import("stripe");
  return new StripeSdk(key, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-11-20.acacia" as any,
  });
}

// Look up a Stripe customer by email, or create one. Idempotent across
// deploys — we search first so we don't create duplicate customers per
// client.
export async function upsertStripeCustomer(
  email: string,
  name?: string,
  phone?: string,
): Promise<{ id: string } | { error: string }> {
  const stripe = await getStripe();
  if (!stripe) return { error: "Stripe not configured" };

  try {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      // Keep the name/phone fresh but don't clobber existing with empty.
      const customer = existing.data[0];
      if ((name && name !== customer.name) || (phone && phone !== customer.phone)) {
        await stripe.customers.update(customer.id, {
          name: name || customer.name || undefined,
          phone: phone || customer.phone || undefined,
        });
      }
      return { id: customer.id };
    }
    const created = await stripe.customers.create({
      email,
      name: name || undefined,
      phone: phone || undefined,
    });
    return { id: created.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stripe customer error" };
  }
}

interface DepositIntentResult {
  clientSecret?: string;
  id?: string;
  customerId?: string;
  error?: string;
}

// Create a PaymentIntent that charges the deposit AND saves the card on the
// Stripe customer for future off-session cancel-fee charges. The booking
// flow's consent checkbox carries the legal authorization for this.
export async function createDepositIntent(
  amountCents: number,
  clientEmail: string,
  clientName?: string,
  clientPhone?: string,
  appointmentMetadata: Record<string, string> = {},
): Promise<DepositIntentResult> {
  const stripe = await getStripe();
  if (!stripe) return { error: "Stripe not configured" };

  const customer = await upsertStripeCustomer(clientEmail, clientName, clientPhone);
  if ("error" in customer) return { error: customer.error };

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customer.id,
      // Save the card on the customer so we can charge it off-session later
      // for no-show / late-cancel fees.
      setup_future_usage: "off_session",
      metadata: {
        ...appointmentMetadata,
        clientEmail,
        reason: appointmentMetadata.reason || "deposit",
      },
      automatic_payment_methods: { enabled: true },
    });
    return {
      clientSecret: intent.client_secret ?? undefined,
      id: intent.id,
      customerId: customer.id,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stripe payment error" };
  }
}

interface OffSessionChargeResult {
  paymentIntentId?: string;
  status?: string;
  amountCharged?: number;
  cardBrand?: string | null;
  cardLast4?: string | null;
  clientSecret?: string;       // set when 3DS re-auth is needed
  requiresAction?: boolean;
  error?: string;
}

// Charge an off-session amount against a saved card. Used by the admin
// cancellation-fee button. If Stripe returns requires_action, we surface
// the client_secret so the admin can email the customer a completion link.
export async function chargeOffSession(args: {
  customerId: string;
  amountCents: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<OffSessionChargeResult> {
  const stripe = await getStripe();
  if (!stripe) return { error: "Stripe not configured" };

  try {
    // Pick the customer's default payment method — or fall back to the most
    // recent saved card.
    const customer = await stripe.customers.retrieve(args.customerId);
    if (customer.deleted) return { error: "Customer deleted in Stripe" };

    let paymentMethodId: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultPm = (customer as any).invoice_settings?.default_payment_method as string | null;
    if (defaultPm) paymentMethodId = defaultPm;

    if (!paymentMethodId) {
      const pms = await stripe.paymentMethods.list({
        customer: args.customerId,
        type: "card",
        limit: 1,
      });
      if (pms.data.length > 0) paymentMethodId = pms.data[0].id;
    }
    if (!paymentMethodId) return { error: "No saved card on file for this client." };

    const intent = await stripe.paymentIntents.create({
      amount: args.amountCents,
      currency: "usd",
      customer: args.customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: args.description,
      metadata: args.metadata,
    });

    // Retrieve with expanded charges so we can pull card brand/last4.
    let cardBrand: string | null = null;
    let cardLast4: string | null = null;
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (pm.card) {
        cardBrand = pm.card.brand;
        cardLast4 = pm.card.last4;
      }
    } catch {
      // best-effort metadata
    }

    return {
      paymentIntentId: intent.id,
      status: intent.status,
      amountCharged: intent.amount,
      cardBrand,
      cardLast4,
      requiresAction: intent.status === "requires_action",
      clientSecret: intent.status === "requires_action" ? (intent.client_secret ?? undefined) : undefined,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // Stripe off-session failures throw StripeCardError — their .raw carries
    // the payment_intent when the bank asked for 3DS re-auth.
    if (err?.raw?.payment_intent?.status === "requires_action") {
      return {
        paymentIntentId: err.raw.payment_intent.id,
        status: "requires_action",
        requiresAction: true,
        clientSecret: err.raw.payment_intent.client_secret,
        error: "Card requires customer authentication (3D Secure).",
      };
    }
    return { error: err?.message || "Off-session charge failed." };
  }
}

// Fetch the card brand + last4 for a given payment_intent so we can record
// a human-friendly line on the charges row.
export async function lookupPaymentMethodFromIntent(intentId: string): Promise<{
  paymentMethodId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
}> {
  const stripe = await getStripe();
  if (!stripe) return { paymentMethodId: null, cardBrand: null, cardLast4: null };
  try {
    const intent = await stripe.paymentIntents.retrieve(intentId, {
      expand: ["payment_method"],
    });
    const pm = typeof intent.payment_method === "string" ? null : intent.payment_method;
    if (pm && pm.card) {
      return { paymentMethodId: pm.id, cardBrand: pm.card.brand, cardLast4: pm.card.last4 };
    }
    const pmId = typeof intent.payment_method === "string" ? intent.payment_method : null;
    return { paymentMethodId: pmId, cardBrand: null, cardLast4: null };
  } catch {
    return { paymentMethodId: null, cardBrand: null, cardLast4: null };
  }
}
