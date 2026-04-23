import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { adminStylistSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { ensurePhotosBucketPublic } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { BOOKING } from "@/lib/constants";
import { normalizeSpecialties } from "@/lib/stylistSpecialties";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  // Auto-heal previously-uploaded stylist photos stuck in a private bucket.
  // No-op after the first successful call.
  ensurePhotosBucketPublic().catch(() => {});

  const { searchParams } = request.nextUrl;
  // /admin/stylists (the management page) wants to see everyone so inactive
  // stylists can still be edited / re-activated. Every other caller —
  // dashboard workload, commissions, analytics — should only see active real
  // stylists and must never see the "Any Stylist" sentinel.
  const includeInactive = searchParams.get("includeInactive") === "true";

  const { data, error } = await supabase
    .from("stylists")
    .select("*")
    .neq("id", BOOKING.ANY_STYLIST_ID)
    .order("sort_order", { ascending: true });

  if (error) {
    logError("admin/stylists GET", error);
    return apiError("Failed to fetch stylists.", 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = includeInactive ? (data || []) : (data || []).filter((s: any) => s.active);
  return apiSuccess(filtered);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!isAdminOrManager(await getSessionUser())) return apiError("Admin access required.", 403);

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

  const specialtiesJson = normalizeSpecialties(payload.specialties);

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
      color: payload.color || null,
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
    revalidatePath("/team");
    revalidatePath("/stylists"); // legacy redirect
    revalidatePath("/book");
  } catch {
    // revalidatePath fails when called outside of a server context — fine to ignore.
  }

  return apiSuccess(data, 201);
}
