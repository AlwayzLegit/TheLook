import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { createSetupIntent, isStripeEnabled } from "@/lib/stripe";
import { NextRequest } from "next/server";

// Save a card on file without charging anything. Used by the booking flow
// for short appointments that don't require the $50 deposit — we still want
// a card on the Stripe customer so the 25% cancellation fee can be charged
// off-session later if the client no-shows.
export async function POST(request: NextRequest) {
  if (!isStripeEnabled()) return apiError("Payments not configured.", 503);

  const body = await request.json();
  const { clientEmail, clientName, clientPhone, description } = body as {
    clientEmail?: string;
    clientName?: string;
    clientPhone?: string;
    description?: string;
  };

  if (!clientEmail) return apiError("clientEmail required.", 400);

  try {
    const si = await createSetupIntent(clientEmail, clientName, clientPhone, {
      description: description || "",
    });
    if (si.error) return apiError(si.error, 500);

    return apiSuccess({
      clientSecret: si.clientSecret,
      setupIntentId: si.id,
      customerId: si.customerId,
    });
  } catch (err) {
    // Bubble the thrown config-guard message up to the client so the admin
    // sees exactly which env var is wrong instead of a generic 500.
    logError("api/setup-intent", err);
    return apiError(
      err instanceof Error ? err.message : "Card form failed to initialize.",
      500,
    );
  }
}
