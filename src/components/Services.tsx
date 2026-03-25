"use client";

import AnimatedSection from "./AnimatedSection";

const serviceCategories = [
  {
    title: "Haircuts",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
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
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    items: [
      { name: "Single Process Root Touch-Up", price: "$50+", duration: "65 min" },
      { name: "Single Process Full Color", price: "$60+", duration: "55 min" },
      { name: "Balayage (incl. toner)", price: "$220+", duration: "180 min" },
      { name: "Full Highlights (incl. toner)", price: "$150+", duration: "180 min" },
      { name: "Partial Highlights (incl. toner)", price: "$110+", duration: "105 min" },
      { name: "Lowlights", price: "$90+", duration: "105 min" },
      { name: "Color Gloss / Toner", price: "$60+", duration: "25 min" },
      { name: "Ombré (incl. toner)", price: "$220+", duration: "150 min" },
      { name: "AirTouch Seamless Highlights", price: "$320+", duration: "180 min" },
      { name: "Bleaching Roots (4–6 wk)", price: "$100+", duration: "90 min" },
      { name: "Full Bleaching", price: "$160+", duration: "130 min" },
      { name: "Brow Tint", price: "$10", duration: "25 min" },
    ],
  },
  {
    title: "Styling",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    items: [
      { name: "Blow-Out", price: "$40+", duration: "40 min" },
      { name: "Thermal Styling (flat/curling iron)", price: "$60+", duration: "60 min" },
      { name: "Formal Updo", price: "$90+", duration: "90 min" },
      { name: "Extensions (clip-in)", price: "$20+", duration: "45 min" },
      { name: "Individual Extensions (i-tip/k-tip/tape-in)", price: "$300+", duration: "120 min" },
      { name: "Braid", price: "$25+", duration: "25 min" },
    ],
  },
  {
    title: "Treatments",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    items: [
      { name: "Custom Hair Treatment Cocktail", price: "$18+", duration: "10+ min" },
      { name: "Deep Conditioning", price: "$30+", duration: "40 min" },
      { name: "B3 Intensive Repair & Rebonding", price: "$80+", duration: "30 min" },
      { name: "Keratin Straightening", price: "$250+", duration: "120 min" },
      { name: "Vitamin Smoothing (99% Natural)", price: "$250+", duration: "120 min" },
      { name: "Scalp Oil Treatment", price: "$30+", duration: "40 min" },
    ],
  },
  {
    title: "Perms & More",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    items: [
      { name: "Perm", price: "$90+", duration: "80 min" },
      { name: "Facial Hair Removal (thread/wax)", price: "$5+", duration: "10+ min" },
    ],
  },
];

export default function Services() {
  return (
    <section id="services" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-6">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Our Service Menu
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Services &amp; Pricing
          </h2>
          <div className="w-16 h-[1px] bg-rose mx-auto mb-4" />
          <p className="text-navy/60 font-body font-light max-w-2xl mx-auto">
            At The Look Hair Salon, we offer the highest quality hair salon
            services in Glendale at unbeatable prices.
          </p>
        </AnimatedSection>

        <AnimatedSection className="text-center mb-16">
          <a
            href="/book"
            className="inline-block bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body"
          >
            Book Online
          </a>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceCategories.map((cat, index) => (
            <AnimatedSection
              key={cat.title}
              delay={index * 0.1}
              className={cat.title === "Color" ? "md:col-span-2 lg:col-span-1 lg:row-span-2" : ""}
            >
              <div className="group p-8 border border-navy/10 hover:border-rose/30 transition-all duration-300 hover:shadow-lg h-full">
                <div className="text-rose mb-4">{cat.icon}</div>
                <h3 className="font-heading text-xl mb-4">{cat.title}</h3>

                <div className="space-y-2.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-baseline gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-navy/70 text-sm font-body block">
                          {item.name}
                        </span>
                        <span className="text-navy/35 text-xs font-body">
                          {item.duration}
                        </span>
                      </div>
                      <span className="text-gold font-heading text-base shrink-0">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12">
          <p className="text-navy/50 text-sm font-body font-light">
            All prices are based upon consultation &amp; subject to change.
            Pricing depends on hair length, thickness &amp; texture. $50 deposit
            required for select color/styling services. 25% cancellation fee for
            no-shows or cancellations within 24 hours.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
