"use client";

import { useState } from "react";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

interface GalleryImage {
  src: string;
  alt: string;
}

interface ServiceGalleryProps {
  title: string;
  subtitle?: string;
  description?: string;
  images: GalleryImage[];
  ctaText?: string;
  ctaHref?: string;
  reversed?: boolean;
}

export default function ServiceGallery({
  title,
  subtitle,
  description,
  images,
  ctaText,
  ctaHref,
  reversed = false,
}: ServiceGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section className="py-24 md:py-32 bg-white relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(196,162,101,0.04)_0%,transparent_70%)]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[radial-gradient(circle,rgba(194,39,75,0.03)_0%,transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
        {/* Header */}
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-16 ${reversed ? "lg:flex-row-reverse" : ""}`}>
          <AnimatedSection className={reversed ? "lg:order-2" : ""}>
            <div className="flex items-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-gold to-gold/30" />
              <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
                {subtitle || "Our Work"}
              </span>
            </div>

            <h2 className="font-heading text-4xl md:text-5xl mb-6 leading-tight">
              {title}
            </h2>

            {description && (
              <p className="text-navy/65 font-body font-light leading-relaxed mb-8">
                {description}
              </p>
            )}

            {ctaText && ctaHref && (
              <a
                href={ctaHref}
                className="inline-flex items-center gap-3 px-6 py-3 border border-navy/20 text-navy text-[11px] tracking-[0.2em] uppercase font-body hover:bg-navy hover:text-white transition-all duration-300 group"
              >
                {ctaText}
                <svg
                  className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            )}
          </AnimatedSection>

          {/* Featured Image */}
          <AnimatedSection delay={0.1} className={reversed ? "lg:order-1" : ""}>
            <div className="relative">
              <div
                className="aspect-[4/3] relative overflow-hidden rounded-sm shadow-[0_20px_60px_rgba(40,41,54,0.12)] cursor-pointer group"
                onClick={() => setSelectedImage(images[0]?.src)}
              >
                <Image
                  src={images[0]?.src}
                  alt={images[0]?.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/10 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Corner accents */}
              <div className="absolute -top-3 -left-3 w-20 h-20 border-t-2 border-l-2 border-gold/30 rounded-tl-sm" />
              <div className="absolute -bottom-3 -right-3 w-20 h-20 border-b-2 border-r-2 border-gold/30 rounded-br-sm" />
            </div>
          </AnimatedSection>
        </div>

        {/* Image Grid */}
        <AnimatedSection delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.slice(1).map((image, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-sm cursor-pointer group"
                onClick={() => setSelectedImage(image.src)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Hover icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-navy/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div
            className="relative w-full max-w-5xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage}
              alt="Gallery image"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
