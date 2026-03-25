"use client";

import AnimatedSection from "./AnimatedSection";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Image placeholder */}
          <AnimatedSection>
            <div className="aspect-[4/5] bg-navy/5 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-navy/20">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm">Salon Interior</p>
                </div>
              </div>
              {/* Gold accent corner */}
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
