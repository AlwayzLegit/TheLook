/**
 * Stripe integration for deposit collection.
 * Only enabled if STRIPE_SECRET_KEY is set.
 */

export function isStripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createDepositIntent(amountCents: number, metadata: Record<string, string>): Promise<any> {
  if (!isStripeEnabled()) {
    return { error: "Stripe not configured" };
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-11-20.acacia" as any,
  });

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return { clientSecret: intent.client_secret, id: intent.id };
}
