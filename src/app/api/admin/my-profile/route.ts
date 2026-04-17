import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser } from "@/lib/roles";
import { stylistSelfProfileSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

async function requireStylist() {
  const user = await getSessionUser();
  if (!user) return { error: apiError("Unauthorized", 401) };
  if (user.role !== "stylist" || !user.stylistId) {
    return { error: apiError("Stylist access required.", 403) };
  }
  return { user };
}

// GET: current stylist's profile row
export async function GET() {
  const { user, error } = await requireStylist();
  if (error) return error;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { data, error: dbError } = await supabase
    .from("stylists")
    .select("*")
    .eq("id", user!.stylistId)
    .single();

  if (dbError) {
    logError("my-profile GET", dbError);
    return apiError("Failed to load profile.", 500);
  }

  return apiSuccess(data);
}

// PATCH: update own profile (name, bio, image_url, specialties)
export async function PATCH(request: NextRequest) {
  const { user, error } = await requireStylist();
  if (error) return error;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  const parsed = stylistSelfProfileSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid profile payload.", 400);
  const payload = parsed.data;

  const updateData: Record<string, unknown> = {
    name: payload.name,
    bio: payload.bio,
    image_url: payload.image_url,
    specialties: payload.specialties,
    slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    updated_at: new Date().toISOString(),
  };

  const { data, error: dbError } = await supabase
    .from("stylists")
    .update(updateData)
    .eq("id", user!.stylistId)
    .select()
    .single();

  if (dbError) {
    logError("my-profile PATCH", dbError);
    return apiError("Failed to update profile.", 500);
  }

  logAdminAction("stylist.self_update", JSON.stringify({ stylistId: user!.stylistId, name: payload.name }));

  return apiSuccess(data);
}
