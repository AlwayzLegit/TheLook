import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { getBranding } from "@/lib/branding";
import { isOptimizableImageHost } from "@/lib/imageHosts";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/seo";

export const revalidate = 60;

// Pre-build every active service detail page so organic-search traffic
// hits a pre-rendered HTML response instead of waiting for on-demand
// SSR. Keeps the existing 60s ISR revalidation intact.
export async function generateStaticParams() {
  if (!hasSupabaseConfig) return [];
  try {
    const { data } = await supabase
      .from("services")
      .select("slug")
      .eq("active", true);
    return ((data || []) as Array<{ slug: string | null }>)
      .filter((r) => !!r.slug)
      .map((r) => ({ slug: r.slug as string }));
  } catch {
    return [];
  }
}

interface ServiceRow {
  id: string;
  category: string;
  name: string;
  slug: string | null;
  price_text: string;
  price_min: number;
  duration: number;
  image_url: string | null;
  description: string | null;
  products_used: string | null;
  active: boolean;
}

interface VariantRow {
  id: string;
  name: string;
  price_text: string;
  duration: number;
}

async function fetchService(slug: string): Promise<{ service: ServiceRow; variants: VariantRow[] } | null> {
  if (!hasSupabaseConfig) return null;
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!service) return null;
  const { data: variants } = await supabase
    .from("service_variants")
    .select("id, name, price_text, duration")
    .eq("service_id", (service as ServiceRow).id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return {
    service: service as ServiceRow,
    variants: (variants || []) as VariantRow[],
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const [result, brand] = await Promise.all([fetchService(slug), getBranding()]);
  if (!result) {
    return { title: `Service | ${brand.name}` };
  }
  const canonical = `/services/item/${slug}`;
  const title = `${result.service.name} | ${brand.name}`;
  const description = result.service.description
    || `Book ${result.service.name} at ${brand.name} in Glendale, CA.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(result.service.image_url
        ? { images: [{ url: result.service.image_url, alt: result.service.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(result.service.image_url ? { images: [result.service.image_url] } : {}),
    },
  };
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function categorySlug(cat: string) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function ServiceDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [result, brand] = await Promise.all([fetchService(slug), getBranding()]);
  if (!result) notFound();
  const { service, variants } = result;

  const breadcrumbsLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Services", url: "/services" },
    { name: service.category, url: `/services/${categorySlug(service.category)}` },
    { name: service.name, url: `/services/item/${slug}` },
  ]);
  const serviceLd = await serviceJsonLd({
    name: service.name,
    slug,
    category: service.category,
    description: service.description,
    imageUrl: service.image_url,
    priceMin: service.price_min,
    priceText: service.price_text,
  });

  return (
    <>
      <Script
        id="ldjson-breadcrumb-service-item"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <Script
        id="ldjson-service-item"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <Navbar />
      <main className="pt-20 pb-20 min-h-[100dvh] bg-cream">
        {/* Breadcrumbs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 text-xs font-body text-navy/70">
          <Link href="/" className="hover:text-navy">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/services" className="hover:text-navy">Services</Link>
          <span className="mx-2">/</span>
          <Link
            href={`/services/${categorySlug(service.category)}`}
            className="hover:text-navy"
          >
            {service.category}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy/70">{service.name}</span>
        </div>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Hero image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy/5 rounded-sm shadow-[0_20px_60px_rgba(40,41,54,0.12)]">
            {service.image_url ? (
              <Image
                src={service.image_url}
                alt={service.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
                // Admins can paste arbitrary photo URLs in
                // /admin/services. Hosts that don't match
                // next.config.ts's remotePatterns 400 inside
                // /_next/image and render a broken-image icon —
                // unoptimized passes the URL through as-is, which is
                // the right call for CMS-driven content.
                unoptimized={!isOptimizableImageHost(service.image_url)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-navy/30 font-body text-sm">
                No photo yet
              </div>
            )}
          </div>

          {/* Copy */}
          <div>
            <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-3">
              {service.category}
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-navy mb-4">
              {service.name}
            </h1>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-gold font-heading text-2xl">{service.price_text}</span>
              <span className="text-navy/70 font-body text-sm">
                {formatDuration(service.duration)}
              </span>
            </div>

            {service.description ? (
              <div className="prose prose-sm max-w-none text-navy/70 font-body leading-relaxed whitespace-pre-wrap mb-6">
                {service.description}
              </div>
            ) : (
              <p className="text-navy/70 font-body font-light leading-relaxed mb-6">
                Treat yourself to our {service.name.toLowerCase()} service. Our team takes the
                time to understand your hair goals and delivers a personalized experience every
                time. Book online or call us at {brand.phone} and we&apos;ll pair you with the
                right stylist.
              </p>
            )}

            {service.products_used && (
              <div className="border-t border-navy/10 pt-5 mb-8">
                <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-2">
                  Products we use
                </p>
                <p className="text-navy/70 font-body text-sm leading-relaxed whitespace-pre-wrap">
                  {service.products_used}
                </p>
              </div>
            )}

            {variants.length > 0 && (
              <div className="border-t border-navy/10 pt-5 mb-8">
                <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-3">
                  Options
                </p>
                <ul className="divide-y divide-navy/5">
                  {variants.map((v) => (
                    <li key={v.id} className="flex items-baseline justify-between py-2">
                      <span className="font-body text-sm text-navy">{v.name}</span>
                      <span className="flex items-baseline gap-3 shrink-0">
                        <span className="text-navy/70 text-xs font-body">
                          {formatDuration(v.duration)}
                        </span>
                        <span className="text-gold font-heading text-base">{v.price_text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/book?service=${service.id}`}
                className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
              >
                Book this service
              </Link>
              <Link
                href={`/services/${categorySlug(service.category)}`}
                className="inline-flex items-center gap-2 border border-navy/20 text-navy hover:border-navy/50 text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
              >
                See all {service.category}
              </Link>
            </div>

            <p className="text-navy/70 text-[11px] font-body mt-6">
              {brand.address} · {brand.phone}
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
