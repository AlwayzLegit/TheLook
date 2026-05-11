"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";
import { useBranding } from "./BrandingProvider";
import { isOptimizableImageHost } from "@/lib/imageHosts";

// `headingLevel` lets the caller pick whether this section's primary
// heading should render as <h1> or <h2>. The home page already mounts
// Hero (with its own <h1>), so it passes "h2" to keep a single h1 per
// page. The standalone /about page passes "h1" — without it the route
// shipped no h1 at all (Round-26 SEO audit, "Missing h1": 372 pages).
export default function About({
  headingLevel = "h2",
}: {
  headingLevel?: "h1" | "h2";
} = {}) {
  const brand = useBranding();
  const Heading = headingLevel;
  return (
    <section id="about" className="py-24 md:py-32 bg-cream relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(196,162,101,0.06)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(194,39,75,0.03)_0%,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Image with accent */}
          <AnimatedSection>
            <div className="relative">
              <div className="aspect-[4/5] relative overflow-hidden rounded-sm shadow-[0_20px_60px_rgba(40,41,54,0.15)]">
                <Image
                  src={brand.images.aboutImage}
                  alt={`Balayage hair styling at ${brand.name}`}
                  fill
                  className="object-cover"
                  unoptimized={!isOptimizableImageHost(brand.images.aboutImage)}
                />
                {/* Subtle gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-navy/20 to-transparent" />
              </div>
              {/* Gold corner accents — refined */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-t-2 border-r-2 border-gold/30 rounded-tr-sm" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 border-b-2 border-l-2 border-gold/30 rounded-bl-sm" />

              {/* Floating badge */}
              <div className="absolute -bottom-6 -right-6 lg:-right-8 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-6 py-4 rounded-sm animate-float">
                <p className="font-heading text-2xl text-rose">14+</p>
                <p className="text-navy/70 text-[10px] tracking-wider uppercase font-body">Years of Excellence</p>
              </div>
            </div>
          </AnimatedSection>

          {/* Content */}
          <AnimatedSection delay={0.2}>
            <div className="flex items-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-gold to-gold/30" />
              <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
                Our Story
              </span>
            </div>

            <Heading className="font-heading text-4xl md:text-5xl mb-7 leading-tight">
              Your Neighborhood
              <br />
              <span className="text-rose">Salon Since 2011</span>
            </Heading>

            <p className="text-navy/75 font-body leading-relaxed mb-5">
              Since opening our doors on 11.11.11, {brand.name} has grown
              to be one of the most loved spots in Glendale. We&apos;re a
              family-owned salon that believes everyone deserves to look and feel
              their best — without breaking the bank.
            </p>

            <p className="text-navy/75 font-body leading-relaxed mb-5">
              With over 25 years in the beauty industry, our skilled stylists
              and colorists specialize in services including men&apos;s,
              women&apos;s, and children&apos;s hair cutting, coloring,
              balayage, ombr&eacute;, highlights, extensions, and styling.
              Walk-ins from Glendale and the greater Los Angeles area are
              always welcome.
            </p>

            <p className="text-navy/75 font-body leading-relaxed mb-10">
              Every appointment starts with a quick consultation so we can
              understand your hair&apos;s history, your day-to-day routine,
              and the look you&apos;re after. Whether it&apos;s a refreshed
              balayage, a precision cut, a keratin treatment, beauty
              treatments like brow tinting and facial threading, or a styled
              blowout for a special occasion, our stylists tailor the
              high-quality experience to you. We use professional,
              salon-grade products and stay current on the latest color
              and cutting techniques so you leave feeling confident — and
              excited to come back.
            </p>

            {/* Stats — Yelp count + rating shared with the bottom
                badge cards via getBranding() so the owner only
                updates one place (/admin/branding → Review badges)
                and both surfaces stay in sync. Photo count stays
                hardcoded for now; the owner can swap it manually
                here when it materially changes. */}
            <div className="flex gap-6 lg:gap-10 pt-7 border-t border-navy/10">
              <div className="text-center px-3">
                <p className="font-heading text-3xl text-navy">{brand.reviewBadges.yelpTotal}+</p>
                <p className="text-navy/70 text-[10px] tracking-wider uppercase font-body mt-1">
                  Yelp Reviews
                </p>
              </div>
              <div className="w-[1px] bg-navy/10" />
              <div className="text-center px-3">
                <p className="font-heading text-3xl text-navy">{brand.reviewBadges.yelpRating.toFixed(1)}</p>
                <p className="text-navy/70 text-[10px] tracking-wider uppercase font-body mt-1">
                  Star Rating
                </p>
              </div>
              <div className="w-[1px] bg-navy/10" />
              <div className="text-center px-3">
                <p className="font-heading text-3xl text-navy">639+</p>
                <p className="text-navy/70 text-[10px] tracking-wider uppercase font-body mt-1">
                  Photos
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
