import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { denyMissingPermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { getStripe } from "@/lib/stripe";
import { NextRequest } from "next/server";

// Issue a full or partial refund against the deposit PaymentIntent
// attached to this appointment. Manual button on the admin side —
// there is no customer-facing trigger. Previously the only refund path
// was a manual Stripe dashboard visit, which meant goodwill refunds
// (e.g. "stylist gave a partial discount after the fact") had to be
// reconciled out-of-band.
//
// Body: { amountCents?: number, reason?: "requested_by_customer" | "duplicate" | "fraudulent" }
//
// Omit amountCents for a full refund.

const ALLOWED_REASONS = new Set(["requested_by_customer", "duplicate", "fraudulent"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "manage_bookings")) return denyMissingPermission(user, "manage_bookings", request);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const amountCents =
    typeof body.amountCents === "number" && body.amountCents > 0
      ? Math.floor(body.amountCents)
      : undefined;
  const reason =
    typeof body.reason === "string" && ALLOWED_REASONS.has(body.reason)
      ? body.reason
      : "requested_by_customer";

  const { data: appointment, error: apptErr } = await supabase
    .from("appointments")
    .select("id, client_name, client_email")
    .eq("id", id)
    .single();

  if (apptErr || !appointment) {
    return apiError("Appointment not found.", 404);
  }

  // Find the most recent successful deposit charge for this appointment.
  const { data: charge, error: chargeErr } = await supabase
    .from("charges")
    .select("id, stripe_payment_intent_id, amount, status")
    .eq("appointment_id", id)
    .eq("type", "deposit")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (chargeErr) {
    logError("refund/charge lookup", chargeErr);
    return apiError("Failed to look up charge record.", 500);
  }
  if (!charge || !charge.stripe_payment_intent_id) {
    return apiError("No refundable deposit charge found for this appointment.", 400);
  }

  const capturedCents: number = charge.amount || 0;
  const refundCents = amountCents ?? capturedCents;
  if (refundCents > capturedCents) {
    return apiError(
      `Refund amount ($${(refundCents / 100).toFixed(2)}) exceeds the captured amount ($${(capturedCents / 100).toFixed(2)}).`,
      400,
    );
  }

  const stripe = await getStripe();
  if (!stripe) return apiError("Stripe is not configured on this environment.", 503);

  let refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: charge.stripe_payment_intent_id,
      amount: refundCents,
      reason: reason as "requested_by_customer" | "duplicate" | "fraudulent",
      metadata: {
        appointment_id: id,
        client_email: appointment.client_email || "",
        issued_by: user.email,
      },
    });
  } catch (err) {
    logError("refund/stripe", err);
    const message = err instanceof Error ? err.message : "Stripe refund failed.";
    return apiError(`Refund failed: ${message}`, 502);
  }

  // Mirror the Stripe status onto our local row so the admin UI reflects
  // the refund immediately. The webhook will reconcile again, but that's
  // idempotent — both write the same fields.
  const fullyRefunded = refundCents >= capturedCents;
  const { error: updateErr } = await supabase
    .from("charges")
    .update({
      status: fullyRefunded ? "refunded" : charge.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", charge.id);

  if (updateErr) {
    logError("refund/mirror update", updateErr);
  }

  await logAdminAction(
    "appointment.refund",
    JSON.stringify({
      appointmentId: id,
      amountCents: refundCents,
      refundId: refund.id,
      reason,
    }),
  );

  return apiSuccess({
    refundId: refund.id,
    amountCents: refundCents,
    capturedCents,
    fullyRefunded,
  });
}
