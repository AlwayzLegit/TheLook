import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { blogPostPatchSchema } from "@/lib/blog/validation";
import { BLOG_CACHE_TAG } from "@/lib/blog/posts";

const POST_SELECT = `
  id, slug, title, excerpt, content_md,
  cover_image_url, cover_image_alt, category_id,
  author_name, author_avatar_url,
  status, published_at, scheduled_for,
  meta_title, meta_description, canonical_url, og_image_url,
  reading_time_minutes, tags, is_featured, view_count,
  created_at, updated_at,
  category:blog_categories ( id, slug, name )
`;

function bust() {
  revalidateTag(BLOG_CACHE_TAG);
  try {
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    revalidatePath("/blog/category/[slug]", "page");
    revalidatePath("/sitemap.xml");
    revalidatePath("/blog/rss.xml");
  } catch { /* best-effort */ }
}

interface Ctx { params: Promise<{ id: string }>; }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return apiError("Invalid id.", 400);

  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logError("admin/blog/posts/[id] GET", error);
    return apiError("Failed to fetch post.", 500);
  }
  if (!data) return apiError("Not found.", 404);
  return apiSuccess(data);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return apiError("Invalid id.", 400);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON.", 400); }
  const parsed = blogPostPatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid body.", 400);
  }
  const input = parsed.data;

  // Resolve category_slug → category_id if a slug was sent.
  if (!input.category_id && input.category_slug) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", input.category_slug)
      .maybeSingle();
    if (!cat) return apiError(`Unknown category slug: ${input.category_slug}`, 400);
    input.category_id = (cat as { id: string }).id;
  }
  // category_slug is a write-only alias — never persist it.
  delete (input as { category_slug?: unknown }).category_slug;

  // If we're transitioning into 'published' without an explicit
  // published_at, stamp now(). Caller can still pass an explicit
  // backdated value to preserve original publication time on edits.
  if (input.status === "published" && !input.published_at) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    if (!existing?.published_at) input.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .update(input)
    .eq("id", id)
    .select(POST_SELECT)
    .single();

  if (error) {
    logError("admin/blog/posts/[id] PATCH", error);
    return apiError(error.message || "Failed to update post.", 500);
  }

  bust();
  await logAdminAction("blog.post.update", JSON.stringify({
    id, fields: Object.keys(input), actor: gate.user.email,
  }));
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return apiError("Invalid id.", 400);

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) {
    logError("admin/blog/posts/[id] DELETE", error);
    return apiError("Failed to delete post.", 500);
  }
  bust();
  await logAdminAction("blog.post.delete", JSON.stringify({ id, actor: gate.user.email }));
  return apiSuccess({ deleted: true });
}
