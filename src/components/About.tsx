"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

export default function About() {
  return (
    <section 
      id="about" 
      className="py-24 md:py-32"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Image with gold accent frame */}
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
              <div 
                className="absolute -top-3 -right-3 w-20 h-20" 
                style={{ 
                  borderTop: "1px solid rgba(196, 162, 101, 0.4)",
                  borderRight: "1px solid rgba(196, 162, 101, 0.4)"
                }}
              />
              <div 
                className="absolute -bottom-3 -left-3 w-20 h-20" 
                style={{ 
                  borderBottom: "1px solid rgba(196, 162, 101, 0.4)",
                  borderLeft: "1px solid rgba(196, 162, 101, 0.4)"
                }}
              />
            </div>
          </AnimatedSection>

          {/* Content */}
          <AnimatedSection delay={0.2}>
            <div className="flex items-center gap-4 mb-5">
              <span className="w-8 h-[1px]" style={{ background: "var(--color-primary-dim)" }} />
              <span 
                className="text-[11px] tracking-[0.25em] uppercase"
                style={{ fontFamily: "var(--font-label)", color: "var(--color-primary-dim)" }}
              >
                Our Story
              </span>
            </div>

            <h2 
              className="text-4xl md:text-5xl mb-7 leading-tight"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
            >
              Your Neighborhood
              <br />
              <span style={{ color: "var(--color-secondary-dim)" }}>Salon Since 2011</span>
            </h2>

            <p 
              className="font-light leading-relaxed mb-5"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-on-surface-variant)" }}
            >
              Since opening our doors on 11.11.11, The Look Hair Salon has grown
              to be one of the most loved spots in Glendale. We&apos;re a
              family-owned salon that believes everyone deserves to look and feel
              their best — without breaking the bank.
            </p>

            <p 
              className="font-light leading-relaxed mb-10"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-on-surface-variant)" }}
            >
              With over 25 years in the beauty industry, our team specializes in
              men&apos;s, women&apos;s, and children&apos;s hair cutting,
              coloring, balayage, ombr&eacute;, highlights, extensions, and
              styling. Walk-ins are always welcome!
            </p>

            {/* Stats */}
            <div 
              className="flex gap-10 pt-7"
              style={{ borderTop: "1px solid var(--color-outline-variant)" }}
            >
              <div>
                <p 
                  className="text-3xl"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
                >
                  830+
                </p>
                <p 
                  className="text-xs tracking-wider uppercase mt-1"
                  style={{ fontFamily: "var(--font-label)", color: "var(--color-outline)" }}
                >
                  Yelp Reviews
                </p>
              </div>
              <div>
                <p 
                  className="text-3xl"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
                >
                  4.2
                </p>
                <p 
                  className="text-xs tracking-wider uppercase mt-1"
                  style={{ fontFamily: "var(--font-label)", color: "var(--color-outline)" }}
                >
                  Star Rating
                </p>
              </div>
              <div>
                <p 
                  className="text-3xl"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
                >
                  639+
                </p>
                <p 
                  className="text-xs tracking-wider uppercase mt-1"
                  style={{ fontFamily: "var(--font-label)", color: "var(--color-outline)" }}
                >
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
