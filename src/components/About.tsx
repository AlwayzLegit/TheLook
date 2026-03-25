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
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"
                alt="Salon interior with styling chairs"
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
              A Passion for Beauty
            </h2>
            <div className="w-16 h-[1px] bg-rose mb-8" />
            <p className="text-navy/70 font-body font-light leading-relaxed mb-6">
              At The Look Hair Salon, we believe that great hair has the power to
              transform not just your appearance, but your confidence. Located in
              the heart of Glendale, California, our salon is a sanctuary where
              artistry meets expertise.
            </p>
            <p className="text-navy/70 font-body font-light leading-relaxed mb-8">
              Our team of experienced stylists brings years of training and a
              genuine love for the craft. From precision cuts to vibrant color
              transformations, we are dedicated to helping you look and feel your
              absolute best.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="font-heading text-3xl text-rose">10+</p>
                <p className="text-navy/50 text-sm mt-1 font-body">
                  Years Experience
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-3xl text-rose">5K+</p>
                <p className="text-navy/50 text-sm mt-1 font-body">
                  Happy Clients
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-3xl text-rose">15+</p>
                <p className="text-navy/50 text-sm mt-1 font-body">
                  Expert Stylists
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
