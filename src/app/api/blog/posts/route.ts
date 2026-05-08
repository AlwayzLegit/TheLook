import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/apiResponse";
import { getPosts, getCategories } from "@/lib/blog/posts";

// Public listing endpoint. Used by the homepage / future RSS feed /
// Claude routines that want to check what's already been published
// before queuing a new post (so they don't accidentally overlap a
// topic). RLS on the underlying table only exposes published posts
// to anon callers anyway, so this just renders that visible set.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") || 12)));
  const offset = Math.max(0, Number(sp.get("offset") || 0));
  const categorySlug = sp.get("category") || null;
  const includeCategories = sp.get("include_categories") === "1";

  const { posts, total } = await getPosts({ limit, offset, categorySlug });
  const lean = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_image_url: p.cover_image_url,
    cover_image_alt: p.cover_image_alt,
    category: p.category ? { slug: p.category.slug, name: p.category.name } : null,
    author_name: p.author_name,
    published_at: p.published_at,
    reading_time_minutes: p.reading_time_minutes,
    tags: p.tags,
    is_featured: p.is_featured,
  }));

  if (includeCategories) {
    const categories = await getCategories();
    return apiSuccess({ posts: lean, total, categories });
  }
  return apiSuccess({ posts: lean, total });
}
