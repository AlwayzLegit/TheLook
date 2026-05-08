import { unstable_cache } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { stripMarkdown } from "./markdown";

// Cache tag busted from the admin save endpoints (POST/PATCH/DELETE
// in /api/admin/blog/*). Page-level revalidatePath calls happen in
// the same admin handlers so a published post hits prod instantly.
export const BLOG_CACHE_TAG = "blog";

export type BlogStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category_id: string | null;
  category: BlogCategory | null;
  author_name: string;
  author_avatar_url: string | null;
  status: BlogStatus;
  published_at: string | null;
  scheduled_for: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  reading_time_minutes: number | null;
  tags: string[];
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const POST_SELECT = `
  id, slug, title, excerpt, content_md,
  cover_image_url, cover_image_alt,
  category_id,
  author_name, author_avatar_url,
  status, published_at, scheduled_for,
  meta_title, meta_description, canonical_url, og_image_url,
  reading_time_minutes, tags, is_featured, view_count,
  created_at, updated_at,
  category:blog_categories ( id, slug, name, description, cover_image_url, meta_title, meta_description, sort_order )
`;

// Public-visibility predicate: published, OR scheduled with the time
// reached. RLS already enforces this against anon callers; we mirror
// it in the application query so the service-role read path (used by
// the public ISR pages) sees the same set.
function applyPublicVisibility<T>(q: T): T {
  // We can't compose nested `or` chains with .or() easily, so we use
  // a Postgres expression. The status check matches an indexed scan
  // and the scheduled_for clause filters from there.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (q as any).or(
    `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${new Date().toISOString()})`,
  ) as T;
}

async function fetchCategoriesUncached(): Promise<BlogCategory[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, slug, name, description, cover_image_url, meta_title, meta_description, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as BlogCategory[];
}

async function fetchPostsUncached(args: {
  limit?: number;
  offset?: number;
  categorySlug?: string | null;
  // When true, posts with is_featured=true are surfaced first
  // regardless of publication date. Used by the /blog index hero
  // pick (page 1 only) so owner-pinned content gets the featured-
  // card treatment instead of always defaulting to most-recent.
  // Off for category pages and pagination pages — those stay
  // strictly chronological so the order is predictable.
  featuredFirst?: boolean;
} = {}): Promise<{ posts: BlogPost[]; total: number }> {
  if (!hasSupabaseConfig) return { posts: [], total: 0 };
  const limit = Math.min(50, Math.max(1, args.limit ?? 12));
  const offset = Math.max(0, args.offset ?? 0);

  // Pull category filter id once if a slug is given
  let categoryId: string | null = null;
  if (args.categorySlug) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", args.categorySlug)
      .eq("active", true)
      .maybeSingle();
    if (!cat) return { posts: [], total: 0 };
    categoryId = (cat as { id: string }).id;
  }

  let q = supabase.from("blog_posts").select(POST_SELECT, { count: "exact" });
  q = applyPublicVisibility(q);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (args.featuredFirst) {
    q = q.order("is_featured", { ascending: false });
  }
  q = q.order("published_at", { ascending: false, nullsFirst: false })
       .range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error || !data) return { posts: [], total: 0 };
  return { posts: data as unknown as BlogPost[], total: count ?? data.length };
}

async function fetchPostBySlugUncached(slug: string): Promise<BlogPost | null> {
  if (!hasSupabaseConfig) return null;
  let q = supabase.from("blog_posts").select(POST_SELECT).eq("slug", slug);
  q = applyPublicVisibility(q);
  const { data } = await q.maybeSingle();
  return (data as unknown as BlogPost) ?? null;
}

async function fetchRelatedUncached(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  if (!hasSupabaseConfig) return [];
  if (!post.category_id) return [];
  let q = supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("category_id", post.category_id)
    .neq("id", post.id);
  q = applyPublicVisibility(q);
  q = q.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
  const { data } = await q;
  return (data as unknown as BlogPost[]) ?? [];
}

// Public helpers — wrapped in unstable_cache so the root layout reads
// don't turn every page dynamic. Bust via revalidateTag(BLOG_CACHE_TAG)
// from the admin save handlers.
export const getCategories = unstable_cache(
  fetchCategoriesUncached,
  ["blog-categories"],
  { revalidate: 60, tags: [BLOG_CACHE_TAG] },
);

export const getPosts = unstable_cache(
  fetchPostsUncached,
  ["blog-posts"],
  { revalidate: 60, tags: [BLOG_CACHE_TAG] },
);

export const getPostBySlug = unstable_cache(
  fetchPostBySlugUncached,
  ["blog-post-by-slug"],
  { revalidate: 60, tags: [BLOG_CACHE_TAG] },
);

export const getRelatedPosts = unstable_cache(
  fetchRelatedUncached,
  ["blog-related"],
  { revalidate: 60, tags: [BLOG_CACHE_TAG] },
);

// Resolved fields the renderer needs — collapses the override-or-fallback
// logic for excerpt, meta_description, og_image, etc. so pages don't
// repeat themselves.
export interface ResolvedBlogPost extends BlogPost {
  resolvedExcerpt: string;
  resolvedMetaTitle: string;
  resolvedMetaDescription: string;
  resolvedOgImage: string | null;
  resolvedCanonical: string;
}

export function resolveBlogPost(post: BlogPost, baseUrl: string): ResolvedBlogPost {
  const excerpt = (post.excerpt && post.excerpt.trim().length > 0)
    ? post.excerpt.trim()
    : stripMarkdown(post.content_md, 200);
  const metaTitle = post.meta_title?.trim() || `${post.title} | The Look Hair Salon`;
  const metaDescription = post.meta_description?.trim() || excerpt;
  const ogImage = post.og_image_url || post.cover_image_url;
  const canonical = post.canonical_url || `${baseUrl}/blog/${post.slug}`;
  return {
    ...post,
    resolvedExcerpt: excerpt,
    resolvedMetaTitle: metaTitle,
    resolvedMetaDescription: metaDescription,
    resolvedOgImage: ogImage,
    resolvedCanonical: canonical,
  };
}
