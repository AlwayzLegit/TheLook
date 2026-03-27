"use client";

import Link from "next/link";
import AnimatedSection from "./AnimatedSection";

const highlights = [
  { name: "Haircuts", price: "From $28", desc: "Men's, women's & children's" },
  { name: "Color & Highlights", price: "From $50", desc: "Balayage, ombré, full color" },
  { name: "Styling", price: "From $40", desc: "Blowouts, updos, extensions" },
  { name: "Treatments", price: "From $30", desc: "Keratin, deep conditioning" },
];

export default function ServicesPreview() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <AnimatedSection className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-8 h-[1px] bg-gold" />
            <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
              What We Offer
            </span>
            <span className="w-8 h-[1px] bg-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl mb-4">
            Our Services
          </h2>
          <p className="text-navy/60 font-body font-light max-w-md mx-auto text-[15px]">
            The highest quality hair services at unbeatable prices.
            Walk-ins always welcome.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {highlights.map((s, i) => (
            <AnimatedSection key={s.name} delay={i * 0.08}>
              <div className="p-7 border border-navy/8 hover:border-rose/20 transition-colors group">
                <p className="font-heading text-xl mb-2 group-hover:text-rose transition-colors">
                  {s.name}
                </p>
                <p className="text-gold font-heading text-lg mb-3">
                  {s.price}
                </p>
                <p className="text-navy/55 font-body font-light text-sm">
                  {s.desc}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-3 text-navy/60 hover:text-rose text-[11px] tracking-[0.2em] uppercase font-body transition-colors"
          >
            View Full Menu &amp; Pricing
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
