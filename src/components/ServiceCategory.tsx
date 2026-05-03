"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";
import { SERVICE_CATEGORIES, type ServiceCategoryMeta } from "@/lib/service-categories";
import { useBranding } from "./BrandingProvider";
import type { BrandingImages } from "@/lib/branding";

// Map a category slug to the BrandingImages slot owner-controllable
// from /admin/branding. Anything not in this map falls back to the
// static heroImage from SERVICE_CATEGORIES, so a future category
// added in code without a settings key still renders.
const HERO_BRANDING_SLOT: Record<string, keyof BrandingImages | undefined> = {
  haircuts: "catHaircuts",
  color: "catColor",
  styling: "catStyling",
  treatments: "catTreatments",
};

function brandedHeroFor(slug: string, branding: ReturnType<typeof useBranding>, fallback: string): string {
  const slot = HERO_BRANDING_SLOT[slug];
  return slot ? branding.images[slot] || fallback : fallback;
}

interface ApiService {
  id: string;
  category: string;
  name: string;
  slug?: string | null;
  price_text: string;
  duration: number;
  image_url?: string | null;
}

interface ServiceCategoryProps {
  category: ServiceCategoryMeta;
}

export default function ServiceCategory({ category }: ServiceCategoryProps) {
  const branding = useBranding();
  const heroImage = brandedHeroFor(category.slug, branding, category.heroImage);
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const otherCategories = SERVICE_CATEGORIES.filter(
    (c) => c.slug !== category.slug,
  );

  useEffect(() => {
    let mounted = true;
    fetch("/api/services")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load services");
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        const categoryServices =
          data?.[category.category] as ApiService[] | undefined;
        if (categoryServices && categoryServices.length > 0) {
          setServices(categoryServices);
        } else {
          setError("Services are temporarily unavailable.");
        }
      })
      .catch(() => {
        if (mounted) setError("Services are temporarily unavailable.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [category.category]);

  return (
    <section className="bg-white relative overflow-hidden">
      {/* Hero Banner */}
      <div className="relative h-[340px] md:h-[420px] overflow-hidden">
        <Image
          src={heroImage}
          alt={category.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/30 to-navy/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <AnimatedSection>
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold/70" />
              <span className="text-gold/90 text-[11px] tracking-[0.3em] uppercase font-body">
                Our Services
              </span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold/70" />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-3">
              {category.title}
            </h1>
            <p className="text-white/80 font-body font-light text-base md:text-lg max-w-lg mx-auto">
              {category.subtitle}
            </p>
          </AnimatedSection>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-8 lg:px-12 pt-8">
        <nav className="flex items-center gap-2 text-xs font-body text-navy/70">
          <Link href="/" className="hover:text-gold transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/services" className="hover:text-gold transition-colors">
            Services
          </Link>
          <span>/</span>
          <span className="text-navy/70">{category.title}</span>
        </nav>
      </div>

      {/* Intro + CTA */}
      <div className="max-w-7xl mx-auto px-8 lg:px-12 py-12 md:py-16">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-navy/70 font-body font-light text-[15px] leading-relaxed mb-8">
            {category.description}
          </p>
          <Link
            href="/book"
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 transition-all duration-300 hover:shadow-[var(--shadow-rose-cta)] hover:-translate-y-0.5"
          >
            Book This Service
          </Link>
        </AnimatedSection>

        {/* Service List */}
        {loading ? (
          <p className="text-center text-navy/70 font-body">
            Loading services...
          </p>
        ) : error ? (
          <p className="text-center text-rose font-body text-sm">{error}</p>
        ) : (
          <AnimatedSection>
            <div className="max-w-3xl mx-auto">
              <div className="border border-navy/8 rounded-xl overflow-hidden">
                {services.map((service, i) => {
                  const image = service.image_url?.trim() || null;
                  const imageKey = `${service.id}:${image || ""}`;
                  const detailHref = service.slug ? `/services/item/${service.slug}` : null;
                  const Row = (
                    <div
                      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 group hover:bg-navy/[0.02] transition-colors ${
                        i < services.length - 1 ? "border-b border-navy/6" : ""
                      }`}
                    >
                      {image && !failedImages[imageKey] ? (
                        <div className="relative w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-lg overflow-hidden border border-navy/10 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic URLs from DB */}
                          <img
                            src={image}
                            alt={service.name}
                            width={72}
                            height={72}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setFailedImages((prev) => ({
                                ...prev,
                                [imageKey]: true,
                              }))
                            }
                          />
                        </div>
                      ) : null}
                      <span className="text-gold font-heading text-base sm:text-lg shrink-0 group-hover:text-rose transition-colors duration-200 w-16 sm:w-24 text-left">
                        {service.price_text}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-navy/80 text-sm sm:text-[15px] font-body group-hover:text-navy transition-colors">
                          {service.name}
                        </p>
                        <p className="text-navy/70 text-xs font-body mt-0.5">
                          {service.duration} min
                        </p>
                      </div>
                      {detailHref && (
                        <svg className="hidden sm:block w-4 h-4 text-navy/20 group-hover:text-rose transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  );
                  return detailHref ? (
                    <Link key={service.id} href={detailHref} className="block">
                      {Row}
                    </Link>
                  ) : (
                    <div key={service.id}>{Row}</div>
                  );
                })}
              </div>

              {category.bookingNote && (
                <p className="text-navy/70 text-xs font-body font-light text-center mt-6 leading-relaxed">
                  {category.bookingNote}
                </p>
              )}

              <p className="text-navy/70 text-xs font-body font-light text-center mt-4 leading-relaxed">
                All prices are based upon consultation &amp; subject to change.
                Pricing depends on hair length, thickness &amp; texture.
              </p>
            </div>
          </AnimatedSection>
        )}
      </div>

      {/* Browse Other Services */}
      <div className="bg-cream/30 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-8 lg:px-12">
          <AnimatedSection className="text-center mb-10">
            <h2 className="font-heading text-2xl md:text-3xl mb-3">
              Explore More Services
            </h2>
            <p className="text-navy/70 font-body font-light text-sm">
              Browse our full range of professional hair services.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {otherCategories.map((cat, i) => (
              <AnimatedSection key={cat.slug} delay={i * 0.08}>
                <Link
                  href={`/services/${cat.slug}`}
                  className="block relative overflow-hidden border border-navy/6 hover:border-gold/30 transition-all duration-500 group hover:shadow-[0_8px_30px_rgba(196,162,101,0.1)] hover:-translate-y-1 bg-white"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={brandedHeroFor(cat.slug, branding, cat.heroImage)}
                      alt={cat.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/40 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                  </div>
                  <div className="p-5 text-center">
                    <p className="font-heading text-lg group-hover:text-rose transition-colors duration-300">
                      {cat.title}
                    </p>
                    <p className="text-navy/70 font-body font-light text-xs mt-1">
                      {cat.subtitle}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose via-gold to-rose scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </Link>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-10">
            <Link
              href="/services"
              className="inline-flex items-center gap-3 text-navy/70 hover:text-rose text-[11px] tracking-[0.2em] uppercase font-body transition-all duration-300 group"
            >
              View Full Menu &amp; Pricing
              <svg
                className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
