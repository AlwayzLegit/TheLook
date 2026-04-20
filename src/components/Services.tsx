"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";
import { getSlugForCategory } from "@/lib/service-categories";

interface ApiService {
  id: string;
  category: string;
  name: string;
  price_text: string;
  duration: number;
  image_url?: string | null;
}

type GroupedServices = Record<string, ApiService[]>;

const CATEGORY_ORDER = ["Haircuts", "Color", "Styling", "Treatments"];

const CATEGORY_ICON: Record<string, ReactNode> = {
  Haircuts: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L7.05 21.192a2.121 2.121 0 11-3-3l7.071-7.07m2.828 2.828l3.536-3.536a2.121 2.121 0 00-3-3L18.05 7.05m-3.929 3.929L7.05 3.93a2.121 2.121 0 10-3 3l7.07 7.071" />
    </svg>
  ),
  Color: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  ),
  Styling: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  ),
  Treatments: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
};

export default function Services() {
  const [servicesByCategory, setServicesByCategory] = useState<GroupedServices>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    fetch("/api/services")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load services");
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setServicesByCategory(data as GroupedServices);
        } else {
          setServicesByCategory({});
          setError("Services are temporarily unavailable.");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("Services are temporarily unavailable.");
        setServicesByCategory({});
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const available = Object.keys(servicesByCategory);
    const ordered = CATEGORY_ORDER.filter((c) => available.includes(c));
    const remainder = available.filter((c) => !CATEGORY_ORDER.includes(c)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remainder];
  }, [servicesByCategory]);

  return (
    <section id="services" className="py-28 md:py-36 bg-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(196,162,101,0.04)_0%,transparent_70%)]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle,rgba(194,39,75,0.02)_0%,transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-8 lg:px-12 relative">
        <AnimatedSection className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              Our Menu
            </span>
            <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Services &amp; Pricing
          </h2>
          <p className="text-navy/60 font-body font-light max-w-lg mx-auto text-[15px]">
            The highest quality hair salon services in Glendale at unbeatable prices.
          </p>
        </AnimatedSection>

        <AnimatedSection className="text-center mb-16">
          <Link
            href="/book"
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(184,36,59,0.3)] hover:-translate-y-0.5"
          >
            Book Online
          </Link>
        </AnimatedSection>

        <AnimatedSection className="mb-14">
          <div className="relative overflow-hidden rounded-2xl border border-navy/10 shadow-[0_20px_70px_rgba(17,24,39,0.08)]">
            <div className="relative aspect-[16/6] md:aspect-[16/5]">
              <Image
                src="/images/hero/salon-main.jpg"
                alt="The Look Hair Salon interior"
                fill
                className={`object-cover ${heroImageFailed ? "hidden" : ""}`}
                sizes="(min-width: 1024px) 1200px, 100vw"
                priority
                onError={() => setHeroImageFailed(true)}
              />
              {heroImageFailed ? <div className="absolute inset-0 bg-navy/10" /> : null}
              <div className="absolute inset-0 bg-gradient-to-r from-navy/40 via-navy/10 to-transparent" />
            </div>
          </div>
        </AnimatedSection>

        {loading ? (
          <p className="text-center text-navy/50 font-body">Loading services...</p>
        ) : error ? (
          <p className="text-center text-rose font-body text-sm">{error}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-14">
            {categories.map((category, catIndex) => (
            <AnimatedSection key={category} delay={catIndex * 0.1}>
              <div>
                <Link
                  href={`/services/${getSlugForCategory(category)}`}
                  className="flex items-center gap-3 mb-6 pb-3 border-b border-navy/10 group"
                >
                  <span className="text-gold/60 group-hover:text-gold transition-colors duration-300">
                    {CATEGORY_ICON[category] || CATEGORY_ICON.Styling}
                  </span>
                  <h3 className="font-heading text-2xl group-hover:text-rose transition-colors duration-300">
                    {category}
                  </h3>
                  <svg className="w-4 h-4 text-navy/30 group-hover:text-rose group-hover:translate-x-1 transition-all duration-300 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <div className="space-y-4">
                  {(servicesByCategory[category] || []).map((item) => {
                    const image = item.image_url?.trim() || null;
                    const imageKey = `${item.id}:${image || ""}`;
                    return (
                    <div key={item.id} className="flex items-center gap-3 group">
                      {image && !failedImages[imageKey] ? (
                        <div className="relative w-[100px] h-[100px] rounded-md overflow-hidden border border-navy/10 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic URLs from DB may not match next/image remotePatterns */}
                          <img
                            src={image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() =>
                              setFailedImages((prev) => ({
                                ...prev,
                                [imageKey]: true,
                              }))
                            }
                          />
                        </div>
                      ) : null}
                      <span className="text-gold font-heading text-base shrink-0 group-hover:text-rose transition-colors duration-200 w-20 text-left">
                        {item.price_text}
                      </span>
                      <span className="text-navy/70 text-[14px] font-body group-hover:text-navy transition-colors duration-200 flex-1 min-w-0">
                        {item.name}
                      </span>
                      <span className="text-navy/45 text-xs font-body shrink-0">
                        {item.duration} min
                      </span>
                    </div>
                    );
                  })}
                </div>
              </div>
            </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection className="text-center mt-14">
          <p className="text-navy/55 text-xs font-body max-w-xl mx-auto leading-relaxed">
            All prices are based upon consultation &amp; subject to change.
            Pricing depends on hair length, thickness &amp; texture. A $50 deposit is
            required for select services; it&apos;s applied toward your total and
            refundable with 24+ hours&apos; notice.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
