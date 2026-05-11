import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// GET client profile + appointment history by email
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_clients", _request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess({ profile: null, appointments: [] });

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  // Get or create profile
  const { data: profile } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("email", decodedEmail)
    .single();

  // Get all appointments for this client
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("client_email", decodedEmail)
    .order("date", { ascending: false });

  // Get discount usage
  const { data: discountUsage } = await supabase
    .from("discount_usage")
    .select("*, discounts(*)")
    .eq("client_email", decodedEmail);

  // Get photos
  const { data: photos } = await supabase
    .from("client_photos")
    .select("*")
    .eq("client_email", decodedEmail)
    .order("created_at", { ascending: false });

  // Derive a payment-method summary for the detail view. The
  // appointment list above already carries the per-row card data; we
  // just surface the most recent capture as "card on file" so the UI
  // can show a Visa •••• 1234-style chip without re-walking the array
  // every render. Also returns the Stripe customer id (if any) so the
  // operator can deep-link into the Stripe dashboard from the panel.
  type ApptCardFields = {
    date: string | null;
    card_brand: string | null;
    card_last4: string | null;
    stripe_payment_method_id: string | null;
  };
  const apptList = (appointments || []) as ApptCardFields[];
  const mostRecentCardAppt = apptList
    .filter((a) => a.card_last4 || a.stripe_payment_method_id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const profileWithStripe = profile as { stripe_customer_id?: string | null } | null;
  const cardOnFile = Boolean(profileWithStripe?.stripe_customer_id) || Boolean(mostRecentCardAppt);
  const cardSummary = {
    cardOnFile,
    cardBrand: mostRecentCardAppt?.card_brand ?? null,
    cardLast4: mostRecentCardAppt?.card_last4 ?? null,
    cardLastSeen: mostRecentCardAppt?.date ?? null,
    stripeCustomerId: profileWithStripe?.stripe_customer_id ?? null,
  };

  return apiSuccess({
    profile,
    appointments: appointments || [],
    discountUsage: discountUsage || [],
    photos: photos || [],
    cardSummary,
  });
}

// PUT update or create client profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_clients", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);
  const body = await request.json();

  const profileData: Record<string, unknown> = {
    email: decodedEmail,
    name: body.name || decodedEmail,
    phone: body.phone || null,
    preferred_stylist_id: body.preferredStylistId || null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    preferences: body.preferences || null,
    internal_notes: body.internalNotes || null,
    allergy_info: body.allergyInfo || null,
    hair_formulas: body.hairFormulas || null,
    hair_type: body.hairType || null,
    birthday: body.birthday || null,
    updated_at: new Date().toISOString(),
  };
  // Only set the banned flag when the caller explicitly included it —
  // otherwise an ordinary profile save would clear the ban state.
  if (Object.prototype.hasOwnProperty.call(body, "banned")) {
    profileData.banned = !!body.banned;
    profileData.banned_reason = body.banned ? (body.bannedReason || null) : null;
  }

  // Upsert: try update first, then insert
  const { data: existing } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("email", decodedEmail)
    .single();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("client_profiles")
      .update(profileData)
      .eq("email", decodedEmail));
  } else {
    ({ error } = await supabase
      .from("client_profiles")
      .insert(profileData));
  }

  if (error) {
    logError("admin/clients PUT", error);
    return apiError("Failed to save profile.", 500);
  }

  logAdminAction("client.profile_update", JSON.stringify({ email: decodedEmail }));
  return apiSuccess({ success: true });
}

// DELETE removes the client_profiles row. Past appointments, discount
// usage, and photos stay — they're a historical record of what
// happened at the salon. Use PUT { banned: true, bannedReason: "..." }
// for soft-ban instead; this is a GDPR-shaped hard delete.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_clients", _request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  // Also wipe their client-uploaded photos — they're PII.
  await supabase.from("client_photos").delete().eq("client_email", decodedEmail);

  const { error } = await supabase
    .from("client_profiles")
    .delete()
    .eq("email", decodedEmail);

  if (error) {
    logError("admin/clients DELETE", error);
    return apiError(`Failed to delete client: ${error.message || "unknown"}`, 500);
  }

  logAdminAction("client.delete", JSON.stringify({ email: decodedEmail }));
  return apiSuccess({ ok: true });
}
