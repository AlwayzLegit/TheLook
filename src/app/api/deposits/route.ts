import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { createDepositIntent, isStripeEnabled } from "@/lib/stripe";
import { NextRequest } from "next/server";

// Create a Stripe PaymentIntent for an appointment deposit
export async function POST(request: NextRequest) {
  if (!isStripeEnabled()) return apiError("Payments not configured.", 503);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  const { appointmentId, amountCents } = body;

  if (!appointmentId || !amountCents) {
    return apiError("appointmentId and amountCents required.", 400);
  }

  // Verify the appointment exists
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, client_email, service_id")
    .eq("id", appointmentId)
    .single();

  if (!appointment) return apiError("Appointment not found.", 404);

  try {
    const intent = await createDepositIntent(amountCents, {
      appointmentId,
      clientEmail: appointment.client_email,
    });

    if (intent.error) return apiError(intent.error, 500);

    // Record deposit in DB
    await supabase.from("deposits").insert({
      appointment_id: appointmentId,
      amount: amountCents,
      stripe_payment_intent_id: intent.id,
      status: "pending",
    });

    return apiSuccess({ clientSecret: intent.clientSecret });
  } catch (err) {
    logError("deposits POST", err);
    return apiError("Failed to create payment.", 500);
  }
}
