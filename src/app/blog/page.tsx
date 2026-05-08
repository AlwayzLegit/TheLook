import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import BlogIndex from "@/components/blog/BlogIndex";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { getCategories, getPosts } from "@/lib/blog/posts";

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  // Pagination canonical: page 1 owns the canonical /blog URL; deeper
  // pages canonicalise to themselves so Google indexes the paginated
  // results separately. rel=prev/next stay on each variant.
  const canonical = page === 1 ? "/blog" : `/blog?page=${page}`;
  return pageMetadata({
    title: "Blog",
    description:
      "Hair care tips, color trends, styling guides, and salon news from The Look Hair Salon in Glendale, CA — straight from our chairs.",
    canonical,
  });
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ posts, total }, categories] = await Promise.all([
    // Page 1 surfaces is_featured posts first (owner-pinned content
    // gets the hero card). Pagination pages stay strictly
    // chronological so the order is predictable as you click through.
    getPosts({ limit: PAGE_SIZE, offset, featuredFirst: page === 1 }),
    getCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ItemList schema covers the listing for Google's rich-result
  // surface; BreadcrumbList covers the site-hierarchy crumb.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: offset + i + 1,
      url: absUrl(`/blog/${p.slug}`),
      name: p.title,
    })),
  };
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  return (
    <>
      <Script
        id="ldjson-blog-itemlist"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <Script
        id="ldjson-blog-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />
      <main className="pt-20">
        <BlogIndex
          title="The Look Journal"
          description="Hair care tips, color trends, styling guides, and salon news — from our chairs in Glendale to yours."
          categories={categories}
          activeCategorySlug={null}
          posts={posts}
          page={page}
          totalPages={totalPages}
          hrefForPage={(n) => (n === 1 ? "/blog" : `/blog?page=${n}`)}
        />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}

function absUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// Revalidate the listing every minute so a freshly published post
// shows up promptly. Admin save handlers also fire revalidatePath.
export const revalidate = 60;
