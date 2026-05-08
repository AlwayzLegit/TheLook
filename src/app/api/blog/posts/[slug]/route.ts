import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getPostBySlug, resolveBlogPost } from "@/lib/blog/posts";
import { renderMarkdown } from "@/lib/blog/markdown";

const SITE_URL = (process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com").replace(/\/$/, "");

interface Ctx { params: Promise<{ slug: string }>; }

// Public single-post endpoint. Returns the resolved fields the public
// page would render (resolved meta title / description / og image /
// canonical) plus rendered HTML so a routine can verify how its
// markdown ended up looking after sanitisation.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!slug || slug.length > 200) return apiError("Invalid slug.", 400);
  const post = await getPostBySlug(slug);
  if (!post) return apiError("Not found.", 404);
  const r = resolveBlogPost(post, SITE_URL);
  const html = await renderMarkdown(post.content_md);
  return apiSuccess({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.resolvedExcerpt,
    content_md: r.content_md,
    content_html: html,
    cover_image_url: r.cover_image_url,
    cover_image_alt: r.cover_image_alt,
    category: r.category ? { slug: r.category.slug, name: r.category.name } : null,
    author_name: r.author_name,
    author_avatar_url: r.author_avatar_url,
    status: r.status,
    published_at: r.published_at,
    scheduled_for: r.scheduled_for,
    reading_time_minutes: r.reading_time_minutes,
    tags: r.tags,
    is_featured: r.is_featured,
    meta_title: r.resolvedMetaTitle,
    meta_description: r.resolvedMetaDescription,
    og_image_url: r.resolvedOgImage,
    canonical_url: r.resolvedCanonical,
  });
}
