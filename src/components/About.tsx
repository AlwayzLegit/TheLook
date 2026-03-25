"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <AnimatedSection>
            <div className="aspect-[4/5] relative overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"
                alt="The Look Hair Salon interior"
                fill
                className="object-cover"
              />
              {/* Gold accent corners */}
              <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-gold" />
              <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-gold" />
            </div>
          </AnimatedSection>

          {/* Content */}
          <AnimatedSection delay={0.2}>
            <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
              Our Story
            </p>
            <h2 className="font-heading text-4xl md:text-5xl mb-6">
              Since 11.11.11
            </h2>
            <div className="w-16 h-[1px] bg-rose mb-8" />
            <p className="text-navy/70 font-body font-light leading-relaxed mb-6">
              Since 2011, The Look Hair Salon has grown to be one of the most
              prominent spots in Glendale, guaranteeing quality and
              professionalism to all of our customers. Over the years, we&apos;ve
              been committed to making our devoted customers look stunning and
              feel their best.
            </p>
            <p className="text-navy/70 font-body font-light leading-relaxed mb-8">
              Family owned &amp; operated with over 25 years in the beauty
              industry, we specialize in men&apos;s, women&apos;s and
              children&apos;s hair cutting, coloring, balayage, ombr&eacute;,
              highlights, hair extensions and styling. At The Look, we offer the
              highest quality hair salon services at unbeatable prices.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="font-heading text-3xl text-rose">25+</p>
                <p className="text-navy/50 text-sm mt-1 font-body">
                  Years in Beauty
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-3xl text-rose">830+</p>
                <p className="text-navy/50 text-sm mt-1 font-body">
                  Yelp Reviews
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-3xl text-rose">4.2</p>
                <p className="text-navy/50 text-sm mt-1 font-body">
                  Star Rating
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
