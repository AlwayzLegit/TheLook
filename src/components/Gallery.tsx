"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const galleryItems = [
  {
    title: "Balayage Blonde",
    category: "Color",
    image:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
  },
  {
    title: "Precision Bob",
    category: "Cut",
    image:
      "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80",
  },
  {
    title: "Bridal Updo",
    category: "Styling",
    image:
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80",
  },
  {
    title: "Vivid Red",
    category: "Color",
    image:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
  },
  {
    title: "Textured Layers",
    category: "Cut",
    image:
      "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&q=80",
  },
  {
    title: "Curly Blowout",
    category: "Styling",
    image:
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&q=80",
  },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Our Work
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">Gallery</h2>
          <div className="w-16 h-[1px] bg-rose mx-auto" />
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryItems.map((item, index) => (
            <AnimatedSection key={item.title} delay={index * 0.1}>
              <div className="group relative aspect-square overflow-hidden cursor-pointer">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-navy/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="font-heading text-lg">{item.title}</p>
                    <p className="text-gold text-sm mt-1">{item.category}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-navy/60 hover:text-rose transition-colors text-sm tracking-widest uppercase font-body"
          >
            See more on Instagram
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
