import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { blogCategoryPatchSchema } from "@/lib/blog/validation";
import { BLOG_CACHE_TAG } from "@/lib/blog/posts";

function bust() {
  revalidateTag(BLOG_CACHE_TAG);
  try {
    revalidatePath("/blog");
    revalidatePath("/blog/category/[slug]", "page");
    revalidatePath("/sitemap.xml");
  } catch { /* best-effort */ }
}

interface Ctx { params: Promise<{ id: string }>; }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const gate = await requirePermission("manage_content", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return apiError("Invalid id.", 400);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON.", 400); }
  const parsed = blogCategoryPatchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid body.", 400);

  const { data, error } = await supabase
    .from("blog_categories")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    logError("admin/blog/categories/[id] PATCH", error);
    return apiError(error.message || "Failed to update category.", 500);
  }
  bust();
  await logAdminAction("blog.category.update", JSON.stringify({
    id, fields: Object.keys(parsed.data), actor: gate.user.email,
  }));
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const gate = await requirePermission("manage_content", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return apiError("Invalid id.", 400);

  // Posts referencing this category get their category_id NULLed by
  // the FK ON DELETE SET NULL, so the deletion is non-destructive at
  // the post level — they'll just lose their category badge.
  const { error } = await supabase.from("blog_categories").delete().eq("id", id);
  if (error) {
    logError("admin/blog/categories/[id] DELETE", error);
    return apiError("Failed to delete category.", 500);
  }
  bust();
  await logAdminAction("blog.category.delete", JSON.stringify({ id, actor: gate.user.email }));
  return apiSuccess({ deleted: true });
}
