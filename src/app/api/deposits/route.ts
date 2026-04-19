import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { createDepositIntent, isStripeEnabled } from "@/lib/stripe";
import { NextRequest } from "next/server";

// Create a Stripe PaymentIntent for an appointment deposit.
//
// Two modes:
//   1. Pre-booking — when an appointment doesn't exist yet (long appointments
//      require a deposit before the appointment is even created). Caller
//      passes amountCents + clientEmail + clientName + description. Returns
//      a client_secret AND a paymentIntentId; the caller must include the
//      paymentIntentId in the subsequent POST /api/appointments call.
//   2. Post-booking — caller passes appointmentId + amountCents.
export async function POST(request: NextRequest) {
  if (!isStripeEnabled()) return apiError("Payments not configured.", 503);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  const { appointmentId, amountCents, clientEmail, clientName, description } = body as {
    appointmentId?: string;
    amountCents?: number;
    clientEmail?: string;
    clientName?: string;
    description?: string;
  };

  if (!amountCents || amountCents <= 0) {
    return apiError("amountCents required.", 400);
  }

  let metadata: Record<string, string> = {};

  if (appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, client_email")
      .eq("id", appointmentId)
      .single();
    if (!appointment) return apiError("Appointment not found.", 404);
    metadata = {
      appointmentId,
      clientEmail: (appointment.client_email as string) || "",
    };
  } else {
    if (!clientEmail) return apiError("clientEmail required when appointmentId is absent.", 400);
    metadata = {
      preBooking: "true",
      clientEmail,
      clientName: clientName || "",
      description: description || "",
    };
  }

  try {
    const intent = await createDepositIntent(amountCents, metadata);
    if (intent.error) return apiError(intent.error, 500);

    if (appointmentId) {
      await supabase.from("deposits").insert({
        appointment_id: appointmentId,
        amount: amountCents,
        stripe_payment_intent_id: intent.id,
        status: "pending",
      });
    }

    return apiSuccess({
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.id,
    });
  } catch (err) {
    logError("deposits POST", err);
    return apiError("Failed to create payment.", 500);
  }
}
