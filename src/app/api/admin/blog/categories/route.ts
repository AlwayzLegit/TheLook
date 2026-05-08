import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { blogCategoryWriteSchema } from "@/lib/blog/validation";
import { BLOG_CACHE_TAG } from "@/lib/blog/posts";

function bust() {
  revalidateTag(BLOG_CACHE_TAG);
  try {
    revalidatePath("/blog");
    revalidatePath("/blog/category/[slug]", "page");
    revalidatePath("/sitemap.xml");
  } catch { /* best-effort */ }
}

export async function GET(request: NextRequest) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error } = await supabase
    .from("blog_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    logError("admin/blog/categories GET", error);
    return apiError("Failed to fetch categories.", 500);
  }
  return apiSuccess(data ?? []);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON.", 400); }
  const parsed = blogCategoryWriteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid body.", 400);
  }
  const input = parsed.data;

  const { data, error } = await supabase
    .from("blog_categories")
    .upsert({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      cover_image_url: input.cover_image_url ?? null,
      meta_title: input.meta_title ?? null,
      meta_description: input.meta_description ?? null,
      sort_order: input.sort_order ?? 0,
      active: input.active ?? true,
    }, { onConflict: "slug" })
    .select("*")
    .single();
  if (error) {
    logError("admin/blog/categories POST", error);
    return apiError(error.message || "Failed to save category.", 500);
  }
  bust();
  await logAdminAction("blog.category.upsert", JSON.stringify({
    slug: input.slug, actor: gate.user.email,
  }));
  return apiSuccess(data, 201);
}
