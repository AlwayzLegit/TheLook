"use client";

import AnimatedSection from "./AnimatedSection";

const serviceCategories = [
  {
    title: "Cutting",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
    items: [
      { name: "Clipper Cut", price: "$28" },
    ],
    note: "Prices are for haircut only. Wash & styling can be added at additional cost.",
  },
  {
    title: "Styling",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    items: [
      { name: "Blowout", price: "$40 & up" },
    ],
    note: "Extensions available: K-tip, I-tip, U-tip, MicroBeads. Deposit required for custom extensions.",
  },
  {
    title: "Color & Perms",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    items: [
      { name: "Single Process Roots", price: "$50 & up" },
    ],
    note: "Roots are 4–6 weeks of growth. Balayage, ombre, highlights also available.",
  },
  {
    title: "Hair Treatments",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    items: [
      { name: "B3 Intensive Repair", price: "$60 & up" },
      { name: "B3 Bond Builder Boost (add-on)", price: "$25 & up" },
      { name: "Deep Conditioning", price: "$30 & up" },
      { name: "Scalp Oil Treatment", price: "$30 & up" },
      { name: "Keratin Straightening", price: "$250 & up" },
      { name: "Vitamin Smoothing Treatment", price: "$250 & up" },
    ],
    note: "Vitamin Smoothing uses 99.8% natural ingredients.",
  },
  {
    title: "Facial Threading & Waxing",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    items: [
      { name: "Upper Lip", price: "$5" },
    ],
    note: "Complement your hairstyle with perfectly shaped eyebrows & smooth, hair-free skin.",
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
            href="https://thelookhairsalon.glossgenius.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body"
          >
            Book Online
          </a>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceCategories.map((cat, index) => (
            <AnimatedSection key={cat.title} delay={index * 0.1}>
              <div className="group p-8 border border-navy/10 hover:border-rose/30 transition-all duration-300 hover:shadow-lg h-full">
                <div className="text-rose mb-4">{cat.icon}</div>
                <h3 className="font-heading text-xl mb-4">{cat.title}</h3>

                <div className="space-y-3 mb-4">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-baseline"
                    >
                      <span className="text-navy/70 text-sm font-body">
                        {item.name}
                      </span>
                      <span className="text-gold font-heading text-base ml-4 shrink-0">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>

                {cat.note && (
                  <p className="text-navy/40 text-xs font-body font-light leading-relaxed border-t border-navy/10 pt-3 mt-auto">
                    {cat.note}
                  </p>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12">
          <p className="text-navy/50 text-sm font-body font-light">
            All prices are based upon consultation &amp; subject to change.
            Pricing depends on hair length, thickness &amp; texture.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
