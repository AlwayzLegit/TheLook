import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { getBranding } from "@/lib/branding";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { renderMarkdown } from "@/lib/blog/markdown";
import { isOptimizableImageHost } from "@/lib/imageHosts";

export const revalidate = 60;

interface NeighborhoodRow {
  slug: string;
  name: string;
  short_name: string;
  primary_keyword: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  hero_subtitle: string | null;
  distance_miles: number | null;
  drive_time_minutes: number | null;
  body_md: string;
  hero_image_url: string | null;
  related_service_slugs: string[] | null;
}

interface NeighborhoodFaq {
  question: string;
  answer: string;
}

interface RelatedServiceRow {
  slug: string;
  name: string;
  image_url: string | null;
  price_text: string;
}

// Pre-build every active neighborhood page so organic traffic hits a
// pre-rendered HTML response. Matches the pattern used by
// /services/item/[slug] and /team/[slug].
export async function generateStaticParams() {
  if (!hasSupabaseConfig) return [];
  try {
    const { data } = await supabase
      .from("neighborhoods")
      .select("slug")
      .eq("active", true);
    return ((data || []) as Array<{ slug: string | null }>)
      .filter((r) => !!r.slug)
      .map((r) => ({ slug: r.slug as string }));
  } catch {
    return [];
  }
}

async function fetchNeighborhood(slug: string): Promise<NeighborhoodRow | null> {
  if (!hasSupabaseConfig) return null;
  const { data } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return (data as NeighborhoodRow | null) ?? null;
}

async function fetchNeighborhoodFaqs(slug: string): Promise<NeighborhoodFaq[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data } = await supabase
      .from("neighborhood_faqs")
      .select("question, answer, sort_order")
      .eq("neighborhood_slug", slug)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return ((data || []) as Array<NeighborhoodFaq & { sort_order: number | null }>).map(
      ({ question, answer }) => ({ question, answer }),
    );
  } catch {
    return [];
  }
}

// Hydrate the related_service_slugs array into a small list of service
// rows so we can render an internal-link rail at the bottom of the
// page. Each link gives the related service a geo-relevant inbound
// anchor — "Burbank residents most book Balayage" type framing — which
// is the cross-link benefit the plan calls out in WP-E.
async function fetchRelatedServices(slugs: string[]): Promise<RelatedServiceRow[]> {
  if (!hasSupabaseConfig || slugs.length === 0) return [];
  try {
    const { data } = await supabase
      .from("services")
      .select("slug, name, image_url, price_text")
      .eq("active", true)
      .in("slug", slugs);
    // Preserve the order the migration declared so the most relevant
    // service for the neighborhood appears first.
    const bySlug = new Map<string, RelatedServiceRow>();
    for (const row of (data || []) as RelatedServiceRow[]) {
      bySlug.set(row.slug, row);
    }
    return slugs.map((s) => bySlug.get(s)).filter((r): r is RelatedServiceRow => Boolean(r));
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const n = await fetchNeighborhood(slug);
  if (!n) return { title: "Neighborhood Not Found", robots: { index: false, follow: false } };
  const canonical = `/neighborhoods/${slug}`;
  return {
    title: n.meta_title,
    description: n.meta_description,
    alternates: { canonical },
    openGraph: {
      title: n.meta_title,
      description: n.meta_description,
      url: canonical,
      type: "website",
      ...(n.hero_image_url
        ? { images: [{ url: n.hero_image_url, alt: n.h1 }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: n.meta_title,
      description: n.meta_description,
      ...(n.hero_image_url ? { images: [n.hero_image_url] } : {}),
    },
  };
}

export default async function NeighborhoodPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const n = await fetchNeighborhood(slug);
  if (!n) notFound();

  const [brand, faqs, related, html] = await Promise.all([
    getBranding(),
    fetchNeighborhoodFaqs(slug),
    fetchRelatedServices(n.related_service_slugs ?? []),
    renderMarkdown(n.body_md),
  ]);

  // Schema: BreadcrumbList + (FAQPage if FAQs exist). Deliberately NOT
  // emitting a fresh LocalBusiness/HairSalon block — that would
  // duplicate the canonical org schema scoped to /, which the round-9
  // QA fix specifically removed from every non-home page. The geo
  // signal Google needs for "<city> hair salon" comes from the page's
  // <title>, <h1>, body copy, and the per-service Service schemas on
  // the linked /services/item/* pages (each carries areaServed:
  // Glendale already).
  const breadcrumbsLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Neighborhoods", url: "/neighborhoods" },
    { name: n.name, url: `/neighborhoods/${slug}` },
  ]);
  const faqLd = faqs.length > 0 ? faqJsonLd(faqs) : null;

  return (
    <>
      <Script
        id="ldjson-breadcrumb-neighborhood"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      {faqLd && (
        <Script
          id="ldjson-faq-neighborhood"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <Navbar />
      <main className="pt-20 pb-20 min-h-[100dvh] bg-cream">
        {/* Breadcrumbs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 text-xs font-body text-navy/70">
          <Link href="/" className="hover:text-navy">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/neighborhoods" className="hover:text-navy">Neighborhoods</Link>
          <span className="mx-2">/</span>
          <span className="text-navy/70">{n.short_name}</span>
        </div>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-3">
            Serving {n.short_name}
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl text-navy mb-4">
            {n.h1}
          </h1>
          {n.hero_subtitle && (
            <p className="font-heading text-lg md:text-xl text-navy/70 mb-6">
              {n.hero_subtitle}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-navy/70 font-body text-sm mb-8">
            {n.distance_miles && (
              <span>
                <strong className="text-navy">{n.distance_miles} mi</strong> from {n.short_name}
              </span>
            )}
            {n.drive_time_minutes && (
              <span>
                <strong className="text-navy">~{n.drive_time_minutes} min</strong> drive
              </span>
            )}
            <span>
              {brand.address} · {brand.phone}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
              aria-label={`Book at ${brand.name}`}
            >
              Book an appointment
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 border border-navy/20 text-navy hover:border-navy/50 text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
            >
              See all services
            </Link>
          </div>
        </section>

        {/* Body — markdown rendered through the blog pipeline so we
            get the same heading-anchor + sanitization treatment. */}
        <article
          className="prose prose-sm sm:prose-base max-w-4xl mx-auto px-4 sm:px-6 pb-12 md:pb-16 font-body text-navy/80 prose-headings:font-heading prose-headings:text-navy prose-a:text-rose hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Related services rail. Anchor text is the service name
            itself so each /neighborhoods/<slug> contributes a
            keyword-rich inbound link to the matching /services/item/
            page. */}
        {related.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 md:pb-16">
            <div className="border-t border-navy/10 pt-10 md:pt-12">
              <h2 className="font-heading text-2xl md:text-3xl text-navy mb-2">
                Services {n.short_name} clients book most
              </h2>
              <p className="text-navy/70 font-body text-sm mb-8">
                Click through to see pricing, photos, and the stylists who specialize in each.
              </p>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/services/item/${r.slug}`}
                      className="group block"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy/5 mb-3 rounded-sm">
                        {r.image_url ? (
                          <Image
                            src={r.image_url}
                            alt={`${r.name} at ${brand.name}`}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized={!isOptimizableImageHost(r.image_url)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-navy/30 font-body text-xs">
                            No photo yet
                          </div>
                        )}
                      </div>
                      <p className="font-heading text-base text-navy group-hover:text-rose transition-colors">
                        {r.name}
                      </p>
                      <p className="text-gold font-heading text-sm mt-1">{r.price_text}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* FAQ block — same accordion pattern as the service-item page.
            Visible-content-required rule for FAQPage JSON-LD applies
            here too. */}
        {faqs.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 md:pb-16">
            <div className="border-t border-navy/10 pt-10 md:pt-12">
              <h2 className="font-heading text-2xl md:text-3xl text-navy mb-2">
                Coming from {n.short_name}? Quick answers
              </h2>
              <div className="divide-y divide-navy/10 mt-8">
                {faqs.map((f, i) => (
                  <details
                    key={`${slug}-faq-${i}`}
                    className="group py-4"
                    {...(i === 0 ? { open: true } : {})}
                  >
                    <summary className="font-heading text-base md:text-lg text-navy cursor-pointer list-none flex items-start justify-between gap-4">
                      <span>{f.question}</span>
                      <span
                        aria-hidden
                        className="text-gold text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="text-navy/75 font-body text-sm leading-relaxed mt-3 pr-8">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 md:pb-20 text-center">
          <div className="border-t border-navy/10 pt-10 md:pt-12">
            <h2 className="font-heading text-2xl md:text-3xl text-navy mb-3">
              Ready to book?
            </h2>
            <p className="text-navy/70 font-body text-sm mb-6">
              {brand.name} · {brand.address} · {brand.phone}
            </p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
            >
              Book online
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
