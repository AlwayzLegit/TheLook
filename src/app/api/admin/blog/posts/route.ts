import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";
import { blogPostWriteSchema } from "@/lib/blog/validation";
import { BLOG_CACHE_TAG } from "@/lib/blog/posts";

const POST_SELECT = `
  id, slug, title, excerpt, content_md,
  cover_image_url, cover_image_alt,
  category_id,
  author_name, author_avatar_url,
  status, published_at, scheduled_for,
  meta_title, meta_description, canonical_url, og_image_url,
  reading_time_minutes, tags, is_featured, view_count,
  created_at, updated_at,
  category:blog_categories ( id, slug, name )
`;

function bustBlogCaches() {
  revalidateTag(BLOG_CACHE_TAG);
  try {
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    revalidatePath("/blog/category/[slug]", "page");
    revalidatePath("/sitemap.xml");
    revalidatePath("/blog/rss.xml");
  } catch {
    // Best-effort.
  }
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission("manage_content", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess({ posts: [], total: 0 });

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const categoryId = sp.get("category_id");
  const search = sp.get("q");
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 25)));
  const offset = Math.max(0, Number(sp.get("offset") || 0));

  let q = supabase.from("blog_posts").select(POST_SELECT, { count: "exact" });
  if (status) q = q.eq("status", status);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (search) q = q.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  q = q.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) {
    logError("admin/blog/posts GET", error);
    return apiError("Failed to fetch posts.", 500);
  }
  return apiSuccess({ posts: data ?? [], total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission("manage_content", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON.", 400);
  }
  const parsed = blogPostWriteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request body.", 400);
  }
  const input = parsed.data;

  // Resolve category_slug → category_id if the routine sent a slug.
  let category_id: string | null | undefined = input.category_id;
  if (!category_id && input.category_slug) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", input.category_slug)
      .maybeSingle();
    if (!cat) return apiError(`Unknown category slug: ${input.category_slug}`, 400);
    category_id = (cat as { id: string }).id;
  }

  // Status defaults to draft. If it's published and the caller didn't
  // pass published_at, stamp now() so the public listing has a date.
  const status = input.status ?? "draft";
  const publishedAt = input.published_at
    ?? (status === "published" ? new Date().toISOString() : null);

  // Look up the existing row's published_at (if any) so we can detect
  // the row's first lifetime publish and notify only on that crossing.
  // Using published_at (not status) is the right gate because un-
  // publishing back to "draft" leaves published_at intact, so a
  // draft → published → draft → published cycle correctly fires
  // exactly one notification (on the first publish), not one per
  // crossing. Idempotent re-POSTs of an already-published post
  // also stay quiet.
  const { data: prior } = await supabase
    .from("blog_posts")
    .select("published_at")
    .eq("slug", input.slug)
    .maybeSingle();
  const wasEverPublished = !!(prior as { published_at?: string | null } | null)?.published_at;

  // Build row. Drop undefined/category_slug before upsert.
  const row = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? null,
    content_md: input.content_md,
    cover_image_url: input.cover_image_url ?? null,
    cover_image_alt: input.cover_image_alt ?? null,
    category_id: category_id ?? null,
    author_name: input.author_name ?? "The Look Hair Salon",
    author_avatar_url: input.author_avatar_url ?? null,
    status,
    published_at: publishedAt,
    scheduled_for: input.scheduled_for ?? null,
    meta_title: input.meta_title ?? null,
    meta_description: input.meta_description ?? null,
    canonical_url: input.canonical_url ?? null,
    og_image_url: input.og_image_url ?? null,
    reading_time_minutes: input.reading_time_minutes ?? null,
    tags: input.tags ?? [],
    is_featured: input.is_featured ?? false,
  };

  // Upsert by slug — Claude routines retry on transient failures and
  // expect re-runs to be idempotent. The unique index on slug makes
  // this safe; conflict updates the existing row in place.
  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(row, { onConflict: "slug" })
    .select(POST_SELECT)
    .single();

  if (error) {
    logError("admin/blog/posts POST", error);
    return apiError(error.message || "Failed to save post.", 500);
  }

  bustBlogCaches();
  await logAdminAction("blog.post.upsert", JSON.stringify({
    slug: input.slug, status, actor: gate.user.email,
  }));

  // Notify all admins on the row's first lifetime publish. Skips
  // drafts/scheduled (still in flight), already-published re-saves
  // (the routine's idempotent retry path), AND a draft → published →
  // draft → published cycle (priorPublishedAt stays set across
  // un-publish so the second crossing is silent). Fire-and-forget
  // so a notification write failure can't break the publish.
  if (status === "published" && !wasEverPublished) {
    createNotification({
      toAllAdmins: true,
      type: "blog.post.published",
      title: `New blog post: ${input.title}`,
      body: input.excerpt ?? undefined,
      url: `/blog/${input.slug}`,
    }).catch(() => {});
  }
  return apiSuccess(data, 201);
}
