import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { chargeOffSession, isStripeEnabled } from "@/lib/stripe";
import { sendCancellationFeeReceipt } from "@/lib/email";
import { NextRequest } from "next/server";

// POST /api/admin/appointments/[id]/charge-fee
// Body: { percent?: number; amountCents?: number; reason?: string }
//
// Charges the saved card on file for a cancellation fee. Default is 25% of
// the appointment total. Admin can override with an explicit amountCents
// (e.g. reduced fee as a courtesy) or skip and use the default percent.
//
// The endpoint:
//   1. Resolves the Stripe customer + payment method for this appointment.
//   2. Computes the fee from the sum of appointment_services prices × percent.
//   3. Calls stripe.paymentIntents.create({ off_session: true, confirm: true }).
//   4. Records a 'cancellation_fee' row in charges with success/failure state.
//   5. Emails the client a receipt on success.
//   6. On 3D Secure re-auth requirement: returns the clientSecret so the
//      admin can email the completion link to the customer.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!isStripeEnabled()) return apiError("Payments not configured.", 503);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const percent = typeof body.percent === "number" ? body.percent : 25;
  const explicitAmount = typeof body.amountCents === "number" ? body.amountCents : null;
  const reasonOverride = typeof body.reason === "string" ? body.reason : null;

  // Fetch the appointment + its services so we can compute total.
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();
  if (apptErr || !appt) return apiError("Appointment not found.", 404);

  if (!appt.stripe_customer_id) {
    return apiError(
      "This appointment has no card on file. The client likely booked before card-on-file was enabled.",
      400,
    );
  }

  // Already charged once? Refuse to double-charge unless admin explicitly
  // force-charges via a different endpoint (not exposed here intentionally).
  const alreadyCharged = (appt.cancellation_fee_charged_cents as number | null) ?? 0;
  if (alreadyCharged > 0 && !explicitAmount) {
    return apiError(
      `Cancellation fee already charged ($${(alreadyCharged / 100).toFixed(2)}). Pass an explicit amountCents to charge additional.`,
      409,
    );
  }

  // Sum the service prices for this appointment. Handles multi-service
  // bookings + variant-overridden prices by walking appointment_services
  // first, falling back to the primary service_id if empty.
  let appointmentTotalCents = 0;
  let appointmentLabel = "Appointment";
  const { data: mappings } = await supabase
    .from("appointment_services")
    .select("service_id, variant_id, sort_order")
    .eq("appointment_id", id)
    .order("sort_order", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svcIds = (mappings || []).map((m: any) => m.service_id as string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const varIds = (mappings || []).map((m: any) => m.variant_id).filter(Boolean) as string[];

  const lookupIds = svcIds.length > 0 ? svcIds : [appt.service_id as string];
  const { data: svcs } = await supabase
    .from("services")
    .select("id, name, price_min")
    .in("id", lookupIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svcById: Record<string, any> = Object.fromEntries((svcs || []).map((s: any) => [s.id, s]));

  const { data: variants } = varIds.length > 0
    ? await supabase
        .from("service_variants")
        .select("id, service_id, name, price_min")
        .in("id", varIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const varById = Object.fromEntries((variants || []).map((v: any) => [v.id, v]));

  const names: string[] = [];
  if (mappings && mappings.length > 0) {
    for (const m of mappings) {
      const v = m.variant_id ? varById[m.variant_id as string] : null;
      const s = svcById[m.service_id as string];
      if (v) {
        appointmentTotalCents += v.price_min as number;
        names.push(`${s?.name ?? "Service"} — ${v.name}`);
      } else if (s) {
        appointmentTotalCents += (s.price_min as number) || 0;
        names.push(s.name as string);
      }
    }
  } else if (svcById[appt.service_id as string]) {
    const s = svcById[appt.service_id as string];
    appointmentTotalCents += (s.price_min as number) || 0;
    names.push(s.name as string);
  }
  if (names.length > 0) appointmentLabel = names.join(", ");

  const feeCents = explicitAmount ?? Math.round(appointmentTotalCents * (percent / 100));
  if (feeCents <= 0) {
    return apiError("Computed fee is $0 — nothing to charge.", 400);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminEmail = (session.user as any)?.email || (session.user as any)?.name || "admin";

  const result = await chargeOffSession({
    customerId: appt.stripe_customer_id as string,
    amountCents: feeCents,
    description: `Cancellation fee — ${appointmentLabel} on ${appt.date} at ${appt.start_time}`,
    metadata: {
      appointmentId: id,
      reason: reasonOverride || `No-show / late-cancel fee (${percent}%)`,
      adminEmail,
    },
  });

  // Record the attempt in charges regardless of outcome.
  const chargeRow = {
    appointment_id: id,
    client_email: appt.client_email,
    stripe_customer_id: appt.stripe_customer_id,
    stripe_payment_intent_id: result.paymentIntentId || null,
    type: "cancellation_fee",
    amount: feeCents,
    currency: "USD",
    status: result.status ||
      (result.error ? "failed" : "pending"),
    card_brand: result.cardBrand,
    card_last4: result.cardLast4,
    reason: reasonOverride ||
      `Cancellation fee — ${percent}% of $${(appointmentTotalCents / 100).toFixed(2)}`,
    failure_reason: result.error || null,
    created_by: adminEmail,
    updated_at: new Date().toISOString(),
  };

  if (result.paymentIntentId) {
    await supabase.from("charges").upsert(chargeRow, {
      onConflict: "stripe_payment_intent_id",
    });
  } else {
    await supabase.from("charges").insert(chargeRow);
  }

  // Update the appointment with the cached counter so admin UI reflects it.
  if (result.status === "succeeded") {
    await supabase
      .from("appointments")
      .update({
        cancellation_fee_charged_cents: alreadyCharged + feeCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Send the client a receipt. Non-blocking; don't fail the charge on
    // email delivery issues.
    sendCancellationFeeReceipt({
      clientName: appt.client_name as string,
      clientEmail: appt.client_email as string,
      amountCents: feeCents,
      cardBrand: result.cardBrand || null,
      cardLast4: result.cardLast4 || null,
      serviceName: appointmentLabel,
      date: appt.date as string,
      startTime: appt.start_time as string,
      reason: reasonOverride || `No-show / late-cancel fee (${percent}%)`,
    }).catch((err) => logError("charge-fee email", err));

    await logAdminAction(
      "charge.cancellation_fee",
      JSON.stringify({ id, feeCents, status: "succeeded" }),
      id,
    );

    return apiSuccess({
      ok: true,
      status: "succeeded",
      amountCharged: feeCents,
      cardBrand: result.cardBrand,
      cardLast4: result.cardLast4,
    });
  }

  if (result.requiresAction && result.clientSecret) {
    await logAdminAction(
      "charge.cancellation_fee_requires_action",
      JSON.stringify({ id, feeCents }),
      id,
    );
    return apiSuccess({
      ok: false,
      status: "requires_action",
      paymentIntentId: result.paymentIntentId,
      clientSecret: result.clientSecret,
      message: "The client's bank requires them to authenticate (3D Secure). Email them the completion link.",
    });
  }

  await logAdminAction(
    "charge.cancellation_fee_failed",
    JSON.stringify({ id, feeCents, error: result.error }),
    id,
  );
  return apiError(result.error || "Charge failed.", 402);
}
