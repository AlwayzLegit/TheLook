import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import BlogIndex from "@/components/blog/BlogIndex";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { getCategories, getPosts } from "@/lib/blog/posts";

const PAGE_SIZE = 12;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePage(sp.page);

  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) {
    return { title: "Not Found", robots: { index: false, follow: false } };
  }
  const baseTitle = cat.meta_title?.trim() || `${cat.name} — Blog`;
  const description =
    cat.meta_description?.trim() ||
    cat.description ||
    `${cat.name} articles from The Look Hair Salon's blog.`;
  const canonical = page === 1
    ? `/blog/category/${slug}`
    : `/blog/category/${slug}?page=${page}`;
  return pageMetadata({
    title: baseTitle,
    description,
    canonical,
    ogImage: cat.cover_image_url || undefined,
  });
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function BlogCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const offset = (page - 1) * PAGE_SIZE;

  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();

  const { posts, total } = await getPosts({
    limit: PAGE_SIZE,
    offset,
    categorySlug: slug,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: cat.name, url: `/blog/category/${cat.slug}` },
  ]);

  return (
    <>
      <Script
        id="ldjson-blog-category-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />
      <main className="pt-20">
        <BlogIndex
          title={cat.name}
          description={cat.description}
          categories={cats}
          activeCategorySlug={cat.slug}
          posts={posts}
          page={page}
          totalPages={totalPages}
          hrefForPage={(n) =>
            n === 1
              ? `/blog/category/${cat.slug}`
              : `/blog/category/${cat.slug}?page=${n}`
          }
        />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}

export const revalidate = 60;
