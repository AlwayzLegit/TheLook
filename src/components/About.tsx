"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Image with accent */}
          <AnimatedSection>
            <div className="relative">
              <div className="aspect-[4/5] relative overflow-hidden rounded-sm">
                <Image
                  src="/images/hero/salon-main.jpg"
                  alt="The Look Hair Salon interior"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Gold corner accents */}
              <div className="absolute -top-3 -right-3 w-20 h-20 border-t border-r border-gold/40" />
              <div className="absolute -bottom-3 -left-3 w-20 h-20 border-b border-l border-gold/40" />
            </div>
          </AnimatedSection>

          {/* Content */}
          <AnimatedSection delay={0.2}>
            <div className="flex items-center gap-4 mb-5">
              <span className="w-8 h-[1px] bg-gold" />
              <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
                Our Story
              </span>
            </div>

            <h2 className="font-heading text-4xl md:text-5xl mb-7 leading-tight">
              Your Neighborhood
              <br />
              <span className="text-rose">Salon Since 2011</span>
            </h2>

            <p className="text-navy/65 font-body font-light leading-relaxed mb-5">
              Since opening our doors on 11.11.11, The Look Hair Salon has grown
              to be one of the most loved spots in Glendale. We&apos;re a
              family-owned salon that believes everyone deserves to look and feel
              their best — without breaking the bank.
            </p>

            <p className="text-navy/65 font-body font-light leading-relaxed mb-10">
              With over 25 years in the beauty industry, our team specializes in
              men&apos;s, women&apos;s, and children&apos;s hair cutting,
              coloring, balayage, ombr&eacute;, highlights, extensions, and
              styling. Walk-ins are always welcome!
            </p>

            {/* Stats */}
            <div className="flex gap-10 pt-7 border-t border-navy/10">
              <div>
                <p className="font-heading text-3xl text-navy">830+</p>
                <p className="text-navy/45 text-xs tracking-wider uppercase font-body mt-1">
                  Yelp Reviews
                </p>
              </div>
              <div>
                <p className="font-heading text-3xl text-navy">4.2</p>
                <p className="text-navy/45 text-xs tracking-wider uppercase font-body mt-1">
                  Star Rating
                </p>
              </div>
              <div>
                <p className="font-heading text-3xl text-navy">639+</p>
                <p className="text-navy/45 text-xs tracking-wider uppercase font-body mt-1">
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
