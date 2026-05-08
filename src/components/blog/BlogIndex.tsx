import Link from "next/link";
import Image from "next/image";
import { isOptimizableImageHost } from "@/lib/imageHosts";
import type { BlogCategory, BlogPost } from "@/lib/blog/posts";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

interface Props {
  // Page heading + subhead. The blog index passes the brand-level
  // copy; the category page passes its own.
  title: string;
  description?: string | null;
  categories: BlogCategory[];
  // Slug of the active category — for the chip strip's selected
  // styling. null on the index.
  activeCategorySlug?: string | null;
  posts: BlogPost[];
  page: number;
  totalPages: number;
  // Build the prev/next pagination link. The index uses /blog?page=N,
  // a category page uses /blog/category/<slug>?page=N. Caller decides.
  hrefForPage: (n: number) => string;
}

export default function BlogIndex({
  title, description, categories, activeCategorySlug,
  posts, page, totalPages, hrefForPage,
}: Props) {
  // First post in the visible list gets the hero treatment on page 1.
  // Any of the posts can be flagged is_featured in admin; we surface
  // that flag in the card's eyebrow but the layout placement is
  // strictly about page index, not flag — keeps the grid stable.
  const hero = page === 1 ? posts[0] : null;
  const rest = page === 1 ? posts.slice(1) : posts;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <header className="text-center mb-10 md:mb-14">
          <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-4">
            The Look Journal
          </p>
          <h1 className="font-heading text-4xl md:text-5xl mb-4">{title}</h1>
          {description ? (
            <p className="text-navy/70 font-body font-light max-w-2xl mx-auto text-[15px] leading-relaxed">
              {description}
            </p>
          ) : null}
        </header>

        {/* Category chips */}
        {categories.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-2 mb-10 md:mb-14" aria-label="Blog categories">
            <Link
              href="/blog"
              className={`text-[11px] tracking-[0.2em] uppercase font-body px-4 py-2 rounded-full border transition-colors ${
                !activeCategorySlug
                  ? "border-rose bg-rose text-white"
                  : "border-navy/15 text-navy/70 hover:text-navy hover:border-navy/30"
              }`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/blog/category/${c.slug}`}
                className={`text-[11px] tracking-[0.2em] uppercase font-body px-4 py-2 rounded-full border transition-colors ${
                  activeCategorySlug === c.slug
                    ? "border-rose bg-rose text-white"
                    : "border-navy/15 text-navy/70 hover:text-navy hover:border-navy/30"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        {posts.length === 0 ? (
          <p className="text-center text-navy/70 font-body py-20">
            No posts published yet — check back soon.
          </p>
        ) : (
          <>
            {hero ? <FeaturedCard post={hero} /> : null}

            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                {rest.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-3 mt-16" aria-label="Blog pagination">
                <Link
                  href={hrefForPage(Math.max(1, page - 1))}
                  rel="prev"
                  aria-disabled={page <= 1}
                  className={`text-[11px] tracking-[0.2em] uppercase font-body px-5 py-2 border ${page <= 1 ? "pointer-events-none opacity-30 border-navy/10" : "border-navy/20 hover:border-navy/40"}`}
                >
                  Previous
                </Link>
                <span className="text-navy/70 font-body text-sm">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={hrefForPage(Math.min(totalPages, page + 1))}
                  rel="next"
                  aria-disabled={page >= totalPages}
                  className={`text-[11px] tracking-[0.2em] uppercase font-body px-5 py-2 border ${page >= totalPages ? "pointer-events-none opacity-30 border-navy/10" : "border-navy/20 hover:border-navy/40"}`}
                >
                  Next
                </Link>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function FeaturedCard({ post }: { post: BlogPost }) {
  const cover = post.cover_image_url;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block group relative overflow-hidden border border-navy/8 hover:border-gold/40 transition-all duration-500 bg-white"
    >
      <div className="grid lg:grid-cols-2 gap-0">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] bg-gradient-to-br from-navy/10 to-gold/10 overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={post.cover_image_alt || post.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
              unoptimized={!isOptimizableImageHost(cover)}
            />
          ) : null}
        </div>
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-4">
            Featured
          </p>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl mb-4 leading-tight group-hover:text-rose transition-colors">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="text-navy/70 font-body text-[15px] leading-relaxed mb-6 line-clamp-3">
              {post.excerpt}
            </p>
          ) : null}
          <div className="text-navy/70 text-xs font-body tracking-wide">
            {fmtDate(post.published_at)}
            {post.reading_time_minutes ? ` · ${post.reading_time_minutes} min read` : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const cover = post.cover_image_url;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block group border border-navy/8 hover:border-gold/40 hover:shadow-[0_8px_30px_rgba(196,162,101,0.1)] hover:-translate-y-1 transition-all duration-500 bg-white"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-navy/5 to-gold/10 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt={post.cover_image_alt || post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            unoptimized={!isOptimizableImageHost(cover)}
          />
        ) : null}
      </div>
      <div className="p-6">
        <h3 className="font-heading text-xl mb-2 leading-snug group-hover:text-rose transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="text-navy/70 font-body font-light text-sm leading-relaxed mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        ) : null}
        <div className="text-navy/70 text-xs font-body tracking-wide">
          {fmtDate(post.published_at)}
          {post.reading_time_minutes ? ` · ${post.reading_time_minutes} min read` : ""}
        </div>
      </div>
    </Link>
  );
}
