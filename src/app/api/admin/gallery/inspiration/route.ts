import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextRequest } from "next/server";

// Admin CRUD for the "inspiration" gallery — trend photos the owner
// uploads so clients can browse current styles before their visit.
// Mirrors the shape of /api/admin/gallery/items but with an extra
// category + gender axis so the public page can filter.

const CATEGORIES = ["cut", "color", "styling", "treatment", "other"] as const;
const GENDERS = ["women", "men", "unisex"] as const;

const createSchema = z.object({
  image_url: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(200).nullable().optional(),
  caption: z.string().trim().max(400).nullable().optional(),
  category: z.enum(CATEGORIES).nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  source: z.string().trim().max(200).nullable().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string().trim().min(1).max(2000).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  caption: z.string().trim().max(400).nullable().optional(),
  category: z.enum(CATEGORIES).nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  source: z.string().trim().max(200).nullable().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1).max(500),
});

function revalidatePublic() {
  try {
    revalidatePath("/gallery");
    revalidatePath("/inspiration");
  } catch {
    // best-effort
  }
}

// Pre-migration envs won't have the table yet. Detect that from the
// Postgres error text and return empty rather than 500, so the admin
// UI loads and the user can run the migration on their own schedule.
function isMissingTable(msg: string | null | undefined): boolean {
  return /gallery_inspiration/i.test(msg || "") &&
    (/does not exist|relation|schema cache/i.test(msg || ""));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiSuccess([]);
  const { data, error } = await supabase
    .from("gallery_inspiration")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingTable(error.message)) return apiSuccess([]);
    logError("admin/gallery/inspiration GET", error);
    return apiError("Failed to load inspiration items.", 500);
  }
  return apiSuccess(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid item.", 400);
  }

  let sort_order = parsed.data.sort_order;
  if (sort_order === undefined) {
    const { data: last } = await supabase
      .from("gallery_inspiration")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    sort_order = last && last[0] ? (last[0].sort_order || 0) + 100 : 100;
  }

  const { data, error } = await supabase
    .from("gallery_inspiration")
    .insert({
      image_url: parsed.data.image_url,
      title: parsed.data.title ?? null,
      caption: parsed.data.caption ?? null,
      category: parsed.data.category ?? null,
      gender: parsed.data.gender ?? null,
      source: parsed.data.source ?? null,
      sort_order,
      active: parsed.data.active ?? true,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTable(error.message)) {
      return apiError(
        "The `gallery_inspiration` table doesn't exist yet — run supabase/migrations/20260510_gallery_inspiration.sql in Supabase first.",
        503,
      );
    }
    logError("admin/gallery/inspiration POST", error);
    return apiError(`Failed to create item: ${error.message || "unknown"}`, 500);
  }

  await logAdminAction("gallery.inspiration.create", JSON.stringify({ id: data.id }));
  revalidatePublic();
  return apiSuccess(data, 201);
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));

  if (Array.isArray(body?.order)) {
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid reorder payload.", 400);
    let step = 10;
    for (const id of parsed.data.order) {
      const { error } = await supabase
        .from("gallery_inspiration")
        .update({ sort_order: step, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        logError("admin/gallery/inspiration PATCH reorder", error);
        return apiError("Failed to reorder.", 500);
      }
      step += 10;
    }
    await logAdminAction(
      "gallery.inspiration.reorder",
      JSON.stringify({ count: parsed.data.order.length }),
    );
    revalidatePublic();
    return apiSuccess({ ok: true });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid update.", 400);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.image_url !== undefined) update.image_url = parsed.data.image_url;
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.caption !== undefined) update.caption = parsed.data.caption;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.gender !== undefined) update.gender = parsed.data.gender;
  if (parsed.data.source !== undefined) update.source = parsed.data.source;
  if (parsed.data.sort_order !== undefined) update.sort_order = parsed.data.sort_order;
  if (parsed.data.active !== undefined) update.active = parsed.data.active;

  const { data, error } = await supabase
    .from("gallery_inspiration")
    .update(update)
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error || !data) {
    logError("admin/gallery/inspiration PATCH", error || { message: "no row" });
    return apiError(`Failed to update item: ${error?.message || "no matching row"}`, 500);
  }

  await logAdminAction("gallery.inspiration.update", JSON.stringify({ id: parsed.data.id }));
  revalidatePublic();
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id query param required.", 400);

  const { error } = await supabase.from("gallery_inspiration").delete().eq("id", id);
  if (error) {
    logError("admin/gallery/inspiration DELETE", error);
    return apiError(`Failed to delete: ${error.message || "unknown"}`, 500);
  }
  await logAdminAction("gallery.inspiration.delete", JSON.stringify({ id }));
  revalidatePublic();
  return apiSuccess({ ok: true });
}
