"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const galleryItems = [
  { title: "Balayage Transformation", category: "Color", image: "/images/gallery/gallery-01.jpg" },
  { title: "Precision Cut & Style", category: "Cut", image: "/images/gallery/gallery-02.jpg" },
  { title: "Color & Highlights", category: "Color", image: "/images/gallery/gallery-03.jpg" },
  { title: "Blonde Highlights", category: "Color", image: "/images/gallery/gallery-04.jpg" },
  { title: "Hair Styling", category: "Styling", image: "/images/gallery/gallery-05.jpg" },
  { title: "Vivid Color", category: "Color", image: "/images/gallery/gallery-06.jpg" },
  { title: "Textured Layers", category: "Cut", image: "/images/gallery/gallery-07.jpg" },
  { title: "Ombré", category: "Color", image: "/images/gallery/gallery-08.jpg" },
  { title: "Full Color", category: "Color", image: "/images/gallery/gallery-09.jpg" },
  { title: "Blowout & Style", category: "Styling", image: "/images/gallery/gallery-10.jpg" },
  { title: "Color Correction", category: "Color", image: "/images/gallery/gallery-11.jpg" },
  { title: "Cut & Color", category: "Color", image: "/images/gallery/gallery-12.jpg" },
];

export default function Gallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % galleryItems.length : null
    );
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + galleryItems.length) % galleryItems.length
        : null
    );
  }, []);

  return (
    <section id="gallery" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            A Glimpse of Our Work
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">Gallery</h2>
          <div className="w-16 h-[1px] bg-rose mx-auto mb-4" />
          <p className="text-navy/60 font-body font-light">
            Check out our Instagram for the most recent transformations
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryItems.map((item, index) => (
            <AnimatedSection key={index} delay={index * 0.05}>
              <button
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square overflow-hidden cursor-pointer w-full"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-navy/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="font-heading text-lg">{item.title}</p>
                    <p className="text-gold text-sm mt-1">{item.category}</p>
                  </div>
                </div>
              </button>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12">
          <a
            href="https://www.instagram.com/thelookhairsalon/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-navy/60 hover:text-rose transition-colors text-sm tracking-widest uppercase font-body"
          >
            See more on Instagram
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </AnimatedSection>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button onClick={closeLightbox} aria-label="Close lightbox" className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-10">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-4xl w-full aspect-square md:aspect-[3/4] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={galleryItems[lightboxIndex].image} alt={galleryItems[lightboxIndex].title} fill className="object-contain" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <p className="font-heading text-xl text-white">{galleryItems[lightboxIndex].title}</p>
                <p className="text-gold text-sm font-body">{galleryItems[lightboxIndex].category}</p>
              </div>
            </motion.div>
            <button onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-10">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-body">
              {lightboxIndex + 1} / {galleryItems.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
