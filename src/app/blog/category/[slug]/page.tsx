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

// Server-rendered editorial intro per blog category. The category
// page only had the ~25-word blog_categories.description plus however
// few posts exist, which tripped "Low word count" on all four
// category pages in the 2026-05-15 Semrush audit. Keyed by slug here
// (rather than a new DB column) so there's no migration and the copy
// can't be accidentally blanked from the admin. Falls back to no
// extra block for any future category not listed.
const CATEGORY_INTRO: Record<string, string[]> = {
  "hair-care-tips": [
    "Healthy hair is mostly what happens between salon visits. This is where our stylists share the practical, no-nonsense advice we give clients in the chair every day at The Look in Glendale — how often to really wash, which heat-protectant habits actually matter, how to read a product label, and how to adjust your routine as the seasons change.",
    "Expect straightforward guides on washing and conditioning for your hair type, protecting color between appointments, managing frizz in the Glendale summer, repairing breakage, and the small daily changes that add up to stronger, shinier hair over a few months. No miracle claims — just what works.",
  ],
  "color-trends": [
    "Color is what The Look is known for, and this is where our color specialists break down the techniques and shades we're seeing requested most in Glendale this season. Balayage, ombré, lived-in brunettes, high-lift blondes, copper, and the cooler ash tones — what each one actually is, who it suits, and how much maintenance it really takes.",
    "We write these so you can walk into a consultation already knowing the vocabulary and the trade-offs: how a technique grows out, how often you'll need a gloss or a root touch-up, and whether your current base will hold the color you want without a multi-session lift.",
  ],
  "styling-guides": [
    "Step-by-step styling inspiration and how-to guides from the team at The Look in Glendale — from making a blow-out last five days to flat-ironing without frying your ends to building an event-ready updo that survives the night.",
    "Each guide is written the way we'd explain it standing behind your chair: the tools that matter, the ones that don't, the prep that makes the difference, and the realistic timeline for getting the look at home versus booking it in the salon.",
  ],
  "salon-news": [
    "Updates from The Look Hair Salon in Glendale — new services and treatments we've added, team announcements, seasonal hours, events, and the occasional behind-the-scenes look at how we work.",
    "If you want to know what's new before your next appointment — a new smoothing treatment, an extra stylist joining the floor, a holiday schedule change — this is where it lands first.",
  ],
};

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
        {CATEGORY_INTRO[cat.slug] && (
          <section className="bg-white pb-16 md:pb-20">
            <div className="max-w-3xl mx-auto px-6 lg:px-12">
              <div className="border-t border-navy/10 pt-12">
                <h2 className="font-heading text-2xl md:text-3xl text-navy mb-6">
                  About {cat.name}
                </h2>
                <div className="space-y-5">
                  {CATEGORY_INTRO[cat.slug].map((para, i) => (
                    <p
                      key={i}
                      className="text-navy/80 font-body font-light text-[15px] leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}

export const revalidate = 60;
