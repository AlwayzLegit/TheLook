"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

export default function About() {
  return (
    <section id="about" className="py-28 md:py-36 bg-cream">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Image with overlapping accent */}
          <AnimatedSection>
            <div className="relative">
              <div className="aspect-[3/4] relative overflow-hidden">
                <Image
                  src="/images/hero/salon-main.jpg"
                  alt="The Look Hair Salon interior"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Floating accent frame */}
              <div className="absolute -top-4 -right-4 w-full h-full border border-gold/30 -z-10" />
              {/* Stats overlay */}
              <div className="absolute -bottom-6 -left-6 bg-navy p-8">
                <p className="font-heading text-4xl text-gold">25+</p>
                <p className="text-white/50 text-[11px] tracking-[0.2em] uppercase font-body mt-1">
                  Years of Excellence
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Content */}
          <AnimatedSection delay={0.2}>
            <div className="lg:pl-4">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-8 h-[1px] bg-gold" />
                <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
                  Our Story
                </span>
              </div>

              <h2 className="font-heading text-4xl md:text-5xl mb-8 leading-tight">
                A Legacy of
                <br />
                <span className="text-rose">Beauty &amp; Craft</span>
              </h2>

              <p className="text-navy/60 font-body font-light leading-relaxed mb-6 text-[15px]">
                Since 2011, The Look Hair Salon has grown to be one of the most
                prominent spots in Glendale, guaranteeing quality and
                professionalism to all of our customers. Over the years,
                we&apos;ve been committed to making our devoted customers look
                stunning and feel their best.
              </p>

              <p className="text-navy/60 font-body font-light leading-relaxed mb-10 text-[15px]">
                Family owned &amp; operated with over 25 years in the beauty
                industry, we specialize in men&apos;s, women&apos;s and
                children&apos;s hair cutting, coloring, balayage,
                ombr&eacute;, highlights, extensions and styling.
              </p>

              {/* Stats Row */}
              <div className="flex gap-12 pt-8 border-t border-navy/10">
                <div>
                  <p className="font-heading text-3xl text-navy">830+</p>
                  <p className="text-navy/40 text-[11px] tracking-[0.15em] uppercase font-body mt-1">
                    Yelp Reviews
                  </p>
                </div>
                <div>
                  <p className="font-heading text-3xl text-navy">4.2</p>
                  <p className="text-navy/40 text-[11px] tracking-[0.15em] uppercase font-body mt-1">
                    Star Rating
                  </p>
                </div>
                <div>
                  <p className="font-heading text-3xl text-navy">639+</p>
                  <p className="text-navy/40 text-[11px] tracking-[0.15em] uppercase font-body mt-1">
                    Photos
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
