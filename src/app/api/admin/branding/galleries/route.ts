import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/auditLog";
import { HOME_GALLERY_CACHE_TAG, type HomeSection } from "@/lib/homeGallery";
import { revalidateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { NextRequest } from "next/server";

// CRUD for the home-page gallery sections (Phase 2 of /admin/branding).
// Lists, creates, and bulk-reorders rows in the home_section_images
// table. Per-id update / delete live at the [id]/route.ts sibling.
//
// All four sections share one endpoint — caller passes the section
// in the body / query so the admin UI can render one tab per
// section but reuse the same plumbing.

const ALLOWED_SECTIONS = new Set<HomeSection>(["haircuts", "color", "styling", "treatments"]);

const createSchema = z.object({
  section: z.enum(["haircuts", "color", "styling", "treatments"]),
  image_url: z.string().trim().min(1).max(2000),
  alt: z.string().trim().max(200).nullable().optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
});

function bustCaches() {
  revalidateTag(HOME_GALLERY_CACHE_TAG);
  try {
    revalidatePath("/");
  } catch {
    /* best-effort */
  }
}

export async function GET(request: NextRequest) {
  const gate = await requireAdminOrManager();
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess({ rows: [] });

  const sectionParam = request.nextUrl.searchParams.get("section");
  let q = supabase
    .from("home_section_images")
    .select("id, section, image_url, alt, sort_order, active, created_at, updated_at")
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true });
  if (sectionParam && ALLOWED_SECTIONS.has(sectionParam as HomeSection)) {
    q = q.eq("section", sectionParam);
  }
  const { data, error } = await q;
  if (error) {
    logError("admin/branding/galleries GET", error);
    return apiError("Failed to load home gallery rows.", 500);
  }
  return apiSuccess({ rows: data || [] });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(`Invalid payload: ${first?.message || "validation failed"}`, 400);
  }
  const payload = parsed.data;

  // Default sort_order to "next available" inside the section when
  // the caller doesn't specify one — saves the admin from manually
  // picking a number when adding.
  let sortOrder = payload.sort_order;
  if (typeof sortOrder !== "number") {
    const { data: maxRow } = await supabase
      .from("home_section_images")
      .select("sort_order")
      .eq("section", payload.section)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("home_section_images")
    .insert({
      section: payload.section,
      image_url: payload.image_url,
      alt: payload.alt ?? null,
      sort_order: sortOrder,
      active: payload.active ?? true,
    })
    .select()
    .single();
  if (error) {
    logError("admin/branding/galleries POST", error);
    return apiError(`Failed to add photo: ${error.message || "unknown"}`, 500);
  }

  bustCaches();
  await logAdminAction(
    "branding.gallery.add",
    JSON.stringify({ section: payload.section, id: (data as { id: string }).id, actor: gate.user.email }),
  );
  return apiSuccess(data, 201);
}
