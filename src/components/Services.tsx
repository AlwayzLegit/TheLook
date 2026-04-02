"use client";

import Link from "next/link";
import AnimatedSection from "./AnimatedSection";

const serviceCategories = [
  {
    title: "Haircuts",
    items: [
      { name: "Wash + Cut + Style", price: "$80+", duration: "70 min" },
      { name: "Clipper Cut", price: "$28", duration: "25 min" },
      { name: "Scissor Cut", price: "$40", duration: "25 min" },
      { name: "Bangs Only", price: "$10", duration: "10 min" },
      { name: "Beard Trim", price: "$15", duration: "10 min" },
    ],
  },
  {
    title: "Color",
    items: [
      { name: "Single Process Root Touch-Up", price: "$50+", duration: "65 min" },
      { name: "Single Process Full Color", price: "$60+", duration: "55 min" },
      { name: "Balayage (incl. toner)", price: "$220+", duration: "180 min" },
      { name: "Full Highlights (incl. toner)", price: "$150+", duration: "180 min" },
      { name: "Partial Highlights (incl. toner)", price: "$110+", duration: "105 min" },
      { name: "Ombré (incl. toner)", price: "$220+", duration: "150 min" },
      { name: "AirTouch Seamless Highlights", price: "$320+", duration: "180 min" },
      { name: "Bleaching Roots (4–6 wk)", price: "$100+", duration: "90 min" },
      { name: "Full Bleaching", price: "$160+", duration: "130 min" },
    ],
  },
  {
    title: "Styling",
    items: [
      { name: "Blow-Out", price: "$40+", duration: "40 min" },
      { name: "Thermal Styling", price: "$60+", duration: "60 min" },
      { name: "Formal Updo", price: "$90+", duration: "90 min" },
      { name: "Individual Extensions", price: "$300+", duration: "120 min" },
      { name: "Braid", price: "$25+", duration: "25 min" },
    ],
  },
  {
    title: "Treatments",
    items: [
      { name: "Deep Conditioning", price: "$30+", duration: "40 min" },
      { name: "B3 Intensive Repair", price: "$80+", duration: "30 min" },
      { name: "Keratin Straightening", price: "$250+", duration: "120 min" },
      { name: "Vitamin Smoothing (99% Natural)", price: "$250+", duration: "120 min" },
      { name: "Scalp Oil Treatment", price: "$30+", duration: "40 min" },
    ],
  },
];

export default function Services() {
  return (
    <section 
      id="services" 
      className="py-28 md:py-36"
      style={{ background: "var(--color-surface-container-low)" }}
    >
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        {/* Header */}
        <AnimatedSection className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-8 h-[1px]" style={{ background: "var(--color-primary-dim)" }} />
            <span 
              className="text-[11px] tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-label)", color: "var(--color-primary-dim)" }}
            >
              Our Menu
            </span>
            <span className="w-8 h-[1px]" style={{ background: "var(--color-primary-dim)" }} />
          </div>
          <h2 
            className="text-4xl md:text-5xl mb-6"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
          >
            Services &amp; Pricing
          </h2>
          <p 
            className="max-w-lg mx-auto text-[15px] font-light"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-on-surface-variant)" }}
          >
            The highest quality hair salon services in Glendale at unbeatable prices.
          </p>
        </AnimatedSection>

        {/* CTA */}
        <AnimatedSection className="text-center mb-16">
          <Link
            href="/book"
            className="btn-rose inline-block text-[11px] tracking-[0.2em] uppercase px-10 py-4 rounded-sm"
          >
            Book Online
          </Link>
        </AnimatedSection>

        {/* Service Grid */}
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-14">
          {serviceCategories.map((cat, catIndex) => (
            <AnimatedSection key={cat.title} delay={catIndex * 0.1}>
              <div 
                className="p-8 rounded-sm"
                style={{ background: "var(--color-surface-container)" }}
              >
                <h3 
                  className="text-2xl mb-6 pb-3"
                  style={{ 
                    fontFamily: "var(--font-heading)", 
                    color: "var(--color-on-surface)",
                    borderBottom: "1px solid var(--color-outline-variant)"
                  }}
                >
                  {cat.title}
                </h3>
                <div className="space-y-4">
                  {cat.items.map((item) => (
                    <div key={item.name} className="flex items-baseline gap-3">
                      <span 
                        className="text-[14px]"
                        style={{ fontFamily: "var(--font-body)", color: "var(--color-on-surface)" }}
                      >
                        {item.name}
                      </span>
                      <span 
                        className="flex-1 min-w-[20px] translate-y-[-3px]"
                        style={{ 
                          borderBottom: "1px dotted var(--color-outline-variant)" 
                        }}
                      />
                      <span 
                        className="text-xs shrink-0"
                        style={{ fontFamily: "var(--font-body)", color: "var(--color-outline)" }}
                      >
                        {item.duration}
                      </span>
                      <span 
                        className="text-base shrink-0"
                        style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
                      >
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Disclaimer */}
        <AnimatedSection className="text-center mt-14">
          <p 
            className="text-xs font-light max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-outline)" }}
          >
            All prices are based upon consultation &amp; subject to change.
            Pricing depends on hair length, thickness &amp; texture. $50 deposit
            required for select services.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
