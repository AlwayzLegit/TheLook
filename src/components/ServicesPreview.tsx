"use client";

import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const highlights = [
  {
    name: "Haircuts",
    price: "From $28",
    desc: "Men's, women's & children's",
    image: "/images/Haircuts.jpg",
    href: "/services/haircuts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L7.05 21.192a2.121 2.121 0 11-3-3l7.071-7.07m2.828 2.828l3.536-3.536a2.121 2.121 0 00-3-3L18.05 7.05m-3.929 3.929L7.05 3.93a2.121 2.121 0 10-3 3l7.07 7.071" />
      </svg>
    ),
  },
  {
    name: "Color & Highlights",
    price: "From $50",
    desc: "Balayage, ombré, full color",
    image: "/images/Highlights.jpg",
    href: "/services/color",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    name: "Styling",
    price: "From $40",
    desc: "Blowouts, updos, extensions",
    image: "/images/Styling.jpg",
    href: "/services/styling",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    name: "Treatments",
    price: "From $30",
    desc: "Keratin, deep conditioning",
    image: "/images/Treatments.jpg",
    href: "/services/treatments",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

export default function ServicesPreview() {
  return (
    <section className="py-24 md:py-32 bg-white relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(circle,rgba(196,162,101,0.05)_0%,transparent_70%)]" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(194,39,75,0.03)_0%,transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
              What We Offer
            </span>
            <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl mb-4">
            Our Services
          </h2>
          <p className="text-navy/70 font-body font-light max-w-md mx-auto text-[15px]">
            The highest quality hair services at unbeatable prices.
            Walk-ins always welcome.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {highlights.map((s, i) => (
            <AnimatedSection key={s.name} delay={i * 0.08}>
              <Link href={s.href} className="block relative overflow-hidden border border-navy/6 hover:border-gold/30 transition-all duration-500 group hover:shadow-[0_8px_30px_rgba(196,162,101,0.1)] hover:-translate-y-1 bg-white">
                {/* Service Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-navy/5 to-gold/10">
                  <Image
                    src={s.image}
                    alt={s.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                  {/* Icon badge */}
                  <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gold/70 group-hover:text-rose group-hover:bg-white transition-all duration-500 shadow-sm">
                    {s.icon}
                  </div>
                </div>
                {/* Text content */}
                <div className="p-6">
                  <p className="font-heading text-xl mb-2 group-hover:text-rose transition-colors duration-300">
                    {s.name}
                  </p>
                  <p className="text-gold font-heading text-lg mb-3">
                    {s.price}
                  </p>
                  <p className="text-navy/70 font-body font-light text-sm">
                    {s.desc}
                  </p>
                </div>
                {/* Bottom accent line on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose via-gold to-rose scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </Link>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-3 text-navy/70 hover:text-rose text-[11px] tracking-[0.2em] uppercase font-body transition-all duration-300 group"
          >
            View Full Menu &amp; Pricing
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
