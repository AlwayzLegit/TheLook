import type { Metadata } from "next";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { isOptimizableImageHost } from "@/lib/imageHosts";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getBranding } from "@/lib/branding";
import {
  getPostBySlug,
  getRelatedPosts,
  resolveBlogPost,
  type BlogPost,
} from "@/lib/blog/posts";
import { renderMarkdown } from "@/lib/blog/markdown";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = (process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com").replace(/\/$/, "");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not Found", robots: { index: false, follow: false } };
  const r = resolveBlogPost(post, SITE_URL);
  return {
    title: r.resolvedMetaTitle,
    description: r.resolvedMetaDescription,
    alternates: { canonical: r.resolvedCanonical },
    openGraph: {
      title: r.resolvedMetaTitle,
      description: r.resolvedMetaDescription,
      type: "article",
      url: r.resolvedCanonical,
      ...(r.resolvedOgImage ? { images: [{ url: r.resolvedOgImage, alt: r.title }] } : {}),
      ...(r.published_at ? { publishedTime: r.published_at } : {}),
      ...(r.updated_at ? { modifiedTime: r.updated_at } : {}),
      authors: [r.author_name],
      ...(r.tags.length ? { tags: r.tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: r.resolvedMetaTitle,
      description: r.resolvedMetaDescription,
      ...(r.resolvedOgImage ? { images: [r.resolvedOgImage] } : {}),
    },
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const r = resolveBlogPost(post, SITE_URL);
  const html = await renderMarkdown(post.content_md);
  const brand = await getBranding();
  const related = await getRelatedPosts(post, 3);

  // BlogPosting JSON-LD. headline/image/datePublished/dateModified/
  // author/publisher/mainEntityOfPage are the fields Google's
  // article rich-result requires. We resolve image to absolute URL
  // because @id requires it and relative cover URLs would fail
  // validation.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: r.resolvedMetaDescription,
    image: r.resolvedOgImage ? [absUrl(r.resolvedOgImage)] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: post.author_name,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: brand.name,
      logo: {
        "@type": "ImageObject",
        url: absUrl("/images/logo-mark.png"),
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": r.resolvedCanonical },
    keywords: post.tags.length ? post.tags.join(", ") : undefined,
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    ...(post.category ? [{ name: post.category.name, url: `/blog/category/${post.category.slug}` }] : []),
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  return (
    <>
      <Script
        id="ldjson-blog-article"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <Script
        id="ldjson-blog-article-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />
      <main className="pt-20">
        <article className="bg-white">
          {/* Hero */}
          <header className="relative">
            {post.cover_image_url ? (
              <div className="relative aspect-[16/7] md:aspect-[16/6] bg-gradient-to-br from-navy/10 to-gold/10 overflow-hidden">
                <Image
                  src={post.cover_image_url}
                  alt={post.cover_image_alt || post.title}
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover"
                  unoptimized={!isOptimizableImageHost(post.cover_image_url)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
              </div>
            ) : null}
            <div className="max-w-3xl mx-auto px-6 lg:px-12 py-10 md:py-16">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-xs font-body text-navy/70 mb-6" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-gold transition-colors">Home</Link>
                <span>/</span>
                <Link href="/blog" className="hover:text-gold transition-colors">Blog</Link>
                {post.category ? (
                  <>
                    <span>/</span>
                    <Link
                      href={`/blog/category/${post.category.slug}`}
                      className="hover:text-gold transition-colors"
                    >
                      {post.category.name}
                    </Link>
                  </>
                ) : null}
              </nav>

              {post.category ? (
                <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-4">
                  {post.category.name}
                </p>
              ) : null}
              <h1 className="font-heading text-3xl md:text-5xl mb-5 leading-tight">{post.title}</h1>
              {post.excerpt ? (
                <p className="text-navy/70 font-body text-lg leading-relaxed mb-6">
                  {post.excerpt}
                </p>
              ) : null}
              <div className="flex items-center gap-4 text-navy/70 text-sm font-body">
                <span>{post.author_name}</span>
                <span aria-hidden>·</span>
                <span>{fmtDate(post.published_at)}</span>
                {post.reading_time_minutes ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{post.reading_time_minutes} min read</span>
                  </>
                ) : null}
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="max-w-3xl mx-auto px-6 lg:px-12 pb-16 md:pb-24">
            <div
              className="blog-content font-body text-navy/85 text-[17px] leading-[1.8]"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-12 pt-6 border-t border-navy/10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] tracking-wider uppercase font-body text-navy/70 border border-navy/15 px-3 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="mt-12 p-8 md:p-10 bg-cream/40 border border-navy/8 text-center">
              <h2 className="font-heading text-2xl mb-3">Ready for your next look?</h2>
              <p className="text-navy/70 font-body text-sm mb-6">
                Walk-ins welcome — or pick a stylist + time online.
              </p>
              <Link
                href="/book"
                className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 transition-all duration-300 hover:shadow-[var(--shadow-rose-cta)] hover:-translate-y-0.5"
              >
                Book Now
              </Link>
            </div>
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <section className="bg-cream/30 py-16 md:py-20">
              <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <h2 className="font-heading text-2xl md:text-3xl mb-10 text-center">
                  More from {post.category?.name || "the Journal"}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {related.map((p) => <RelatedCard key={p.id} post={p} />)}
                </div>
              </div>
            </section>
          )}
        </article>
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}

function RelatedCard({ post }: { post: BlogPost }) {
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
        <h3 className="font-heading text-lg mb-2 leading-snug group-hover:text-rose transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-navy/70 text-xs font-body">
          {post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          }) : ""}
        </p>
      </div>
    </Link>
  );
}

function absUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const revalidate = 60;
