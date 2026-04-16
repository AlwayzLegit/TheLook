import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
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

  return apiSuccess({
    profile,
    appointments: appointments || [],
    discountUsage: discountUsage || [],
  });
}

// PUT update or create client profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);
  const body = await request.json();

  const profileData = {
    email: decodedEmail,
    name: body.name || decodedEmail,
    phone: body.phone || null,
    preferred_stylist_id: body.preferredStylistId || null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    preferences: body.preferences || null,
    internal_notes: body.internalNotes || null,
    allergy_info: body.allergyInfo || null,
    birthday: body.birthday || null,
    updated_at: new Date().toISOString(),
  };

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
