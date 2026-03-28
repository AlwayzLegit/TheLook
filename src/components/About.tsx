"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

export default function About() {
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
                  src="/images/hero/salon-main.jpg"
                  alt="The Look Hair Salon interior"
                  fill
                  className="object-cover"
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
                <p className="text-navy/50 text-[10px] tracking-wider uppercase font-body">Years of Excellence</p>
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

            {/* Stats — refined with subtle backgrounds */}
            <div className="flex gap-6 lg:gap-10 pt-7 border-t border-navy/10">
              <div className="text-center px-3">
                <p className="font-heading text-3xl text-navy">830+</p>
                <p className="text-navy/45 text-[10px] tracking-wider uppercase font-body mt-1">
                  Yelp Reviews
                </p>
              </div>
              <div className="w-[1px] bg-navy/10" />
              <div className="text-center px-3">
                <p className="font-heading text-3xl text-navy">4.2</p>
                <p className="text-navy/45 text-[10px] tracking-wider uppercase font-body mt-1">
                  Star Rating
                </p>
              </div>
              <div className="w-[1px] bg-navy/10" />
              <div className="text-center px-3">
                <p className="font-heading text-3xl text-navy">639+</p>
                <p className="text-navy/45 text-[10px] tracking-wider uppercase font-body mt-1">
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
