import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { adminStylistSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  const { data, error } = await supabase
    .from("stylists")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logError("admin/stylists GET", error);
    return apiError("Failed to fetch stylists.", 500);
  }

  return apiSuccess(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!isAdmin(await getSessionUser())) return apiError("Admin access required.", 403);

  const body = await request.json();
  const parsed = adminStylistSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid stylist payload.", 400);
  }
  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }
  const payload = parsed.data;

  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Specialties is stored as a JSON-encoded text column; the validator allows
  // either a string array or a pre-encoded string. Always re-encode arrays so
  // the public /api/stylists endpoint can JSON.parse it cleanly.
  const specialtiesJson = Array.isArray(payload.specialties)
    ? JSON.stringify(payload.specialties)
    : (payload.specialties || JSON.stringify([]));

  const { data, error } = await supabase
    .from("stylists")
    .insert({
      name: payload.name,
      slug: slug,
      bio: payload.bio,
      image_url: payload.image_url,
      specialties: specialtiesJson,
      active: payload.active ?? true,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    logError("admin/stylists POST", error);
    return apiError(`Failed to create stylist: ${error.message || "unknown"}`, 500);
  }

  // New stylists need stylist_services rows or they won't appear in the
  // booking flow. Default to mapping every active service so the stylist is
  // immediately bookable; admins can prune later from the services modal.
  if (data?.id) {
    const { data: activeServices } = await supabase
      .from("services")
      .select("id")
      .eq("active", true);
    const mappings = (activeServices || []).map((s: { id: string }) => ({
      stylist_id: data.id as string,
      service_id: s.id,
    }));
    if (mappings.length > 0) {
      const { error: mErr } = await supabase.from("stylist_services").insert(mappings);
      if (mErr) logError("admin/stylists POST (services)", mErr);
    }
  }

  await logAdminAction("stylist.create", JSON.stringify({ name: payload.name }));

  // Bust ISR caches so the new stylist appears on the live site immediately.
  try {
    revalidatePath("/");
    revalidatePath("/stylists");
    revalidatePath("/book");
  } catch {
    // revalidatePath fails when called outside of a server context — fine to ignore.
  }

  return apiSuccess(data, 201);
}
