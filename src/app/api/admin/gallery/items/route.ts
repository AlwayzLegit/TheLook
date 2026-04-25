import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextRequest } from "next/server";

// Admin CRUD for the main gallery grid rows. Writes go through the shared
// supabase client which uses the service role key in prod, so they bypass
// RLS even though the table has public-read policies in place.

const createSchema = z.object({
  image_url: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(200).nullable().optional(),
  caption: z.string().trim().max(200).nullable().optional(),
  stylist_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string().trim().min(1).max(2000).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  caption: z.string().trim().max(200).nullable().optional(),
  stylist_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1).max(500),
});

function revalidatePublic() {
  try {
    revalidatePath("/gallery");
    revalidatePath("/");
  } catch {
    // best-effort
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess([]);
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    logError("admin/gallery/items GET", error);
    return apiError("Failed to load gallery items.", 500);
  }
  return apiSuccess(data || []);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid item.", 400);
  }

  // Default sort_order to the next hundred so manual inserts fall at the
  // end of the list without the caller having to compute it. Gives plenty
  // of room to drag items in between later.
  let sort_order = parsed.data.sort_order;
  if (sort_order === undefined) {
    const { data: last } = await supabase
      .from("gallery_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    sort_order = last && last[0] ? (last[0].sort_order || 0) + 100 : 100;
  }

  // Pre-migration envs (before 20260511) won't have stylist_id yet —
  // retry without it if the insert errors on that column.
  const baseInsert = {
    image_url: parsed.data.image_url,
    title: parsed.data.title ?? null,
    caption: parsed.data.caption ?? null,
    sort_order,
    active: parsed.data.active ?? true,
  };
  const fullInsert =
    parsed.data.stylist_id !== undefined
      ? { ...baseInsert, stylist_id: parsed.data.stylist_id }
      : baseInsert;

  let { data, error } = await supabase
    .from("gallery_items")
    .insert(fullInsert)
    .select()
    .single();
  if (error && /stylist_id/i.test(error.message || "")) {
    ({ data, error } = await supabase
      .from("gallery_items")
      .insert(baseInsert)
      .select()
      .single());
  }

  if (error) {
    logError("admin/gallery/items POST", error);
    return apiError(`Failed to create item: ${error.message || "unknown"}`, 500);
  }

  logAdminAction("gallery.item.create", JSON.stringify({ id: data.id }));
  revalidatePublic();
  return apiSuccess(data, 201);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));

  // Reorder: caller sends the full ordered array of ids. Cheaper than
  // per-row PATCH when dragging.
  if (Array.isArray(body?.order)) {
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid reorder payload.", 400);
    }
    let step = 10;
    for (const id of parsed.data.order) {
      const { error } = await supabase
        .from("gallery_items")
        .update({ sort_order: step, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        logError("admin/gallery/items PATCH reorder", error);
        return apiError("Failed to reorder.", 500);
      }
      step += 10;
    }
    logAdminAction("gallery.item.reorder", JSON.stringify({ count: parsed.data.order.length }));
    revalidatePublic();
    return apiSuccess({ ok: true });
  }

  // Single-row update.
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid update.", 400);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.image_url !== undefined) update.image_url = parsed.data.image_url;
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.caption !== undefined) update.caption = parsed.data.caption;
  if (parsed.data.stylist_id !== undefined) update.stylist_id = parsed.data.stylist_id;
  if (parsed.data.sort_order !== undefined) update.sort_order = parsed.data.sort_order;
  if (parsed.data.active !== undefined) update.active = parsed.data.active;

  let { data, error } = await supabase
    .from("gallery_items")
    .update(update)
    .eq("id", parsed.data.id)
    .select()
    .single();
  if (error && /stylist_id/i.test(error.message || "") && update.stylist_id !== undefined) {
    // Pre-migration env: drop the stylist_id column from the patch and
    // retry so the rest of the edit still saves.
    delete update.stylist_id;
    ({ data, error } = await supabase
      .from("gallery_items")
      .update(update)
      .eq("id", parsed.data.id)
      .select()
      .single());
  }

  if (error || !data) {
    logError("admin/gallery/items PATCH", error || { message: "no row" });
    return apiError(`Failed to update item: ${error?.message || "no matching row"}`, 500);
  }

  logAdminAction("gallery.item.update", JSON.stringify({ id: parsed.data.id }));
  revalidatePublic();
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id query param required.", 400);

  const { error } = await supabase.from("gallery_items").delete().eq("id", id);
  if (error) {
    logError("admin/gallery/items DELETE", error);
    return apiError(`Failed to delete: ${error.message || "unknown"}`, 500);
  }
  logAdminAction("gallery.item.delete", JSON.stringify({ id }));
  revalidatePublic();
  return apiSuccess({ ok: true });
}
