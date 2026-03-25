"use client";

import AnimatedSection from "./AnimatedSection";

const galleryItems = [
  { title: "Balayage Blonde", category: "Color" },
  { title: "Precision Bob", category: "Cut" },
  { title: "Bridal Updo", category: "Styling" },
  { title: "Vivid Red", category: "Color" },
  { title: "Textured Layers", category: "Cut" },
  { title: "Curly Blowout", category: "Styling" },
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
              <div className="group relative aspect-square bg-navy/5 overflow-hidden cursor-pointer">
                {/* Placeholder for gallery images */}
                <div className="absolute inset-0 flex items-center justify-center text-navy/20">
                  <div className="text-center">
                    <svg
                      className="w-10 h-10 mx-auto mb-1"
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
                    <p className="text-xs">{item.title}</p>
                  </div>
                </div>

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
