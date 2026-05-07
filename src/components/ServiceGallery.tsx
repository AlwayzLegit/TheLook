"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import AnimatedSection from "./AnimatedSection";
import { isOptimizableImageHost } from "@/lib/imageHosts";

interface GalleryImage {
  src: string;
  alt: string;
  // Optional destination — when set, the photo becomes a clickable
  // link (typically /book?service=<id> so the customer lands on
  // booking with that exact service preselected) instead of opening
  // the lightbox. Owner asked for this on the home-page galleries
  // so every photo doubles as a 1-click book CTA.
  href?: string;
  // Optional caption rendered as a subtle bottom-of-image label.
  // Used on the home-page galleries to show each service's name
  // ("Wash + Cut + Style", "Single Process Color", etc.) so the
  // customer knows what they're clicking before they click.
  caption?: string;
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedImage) return;
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

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
              {(() => {
                // Hero overlay icon + classes shared between the
                // Link (book-CTA) and div (lightbox) variants.
                const inner = (
                  <>
                    <Image
                      src={images[0]?.src}
                      alt={images[0]?.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      unoptimized={!isOptimizableImageHost(images[0]?.src)}
                    />
                    <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/10 transition-colors duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                        {images[0]?.href ? (
                          <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {images[0]?.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy/90 via-navy/55 to-transparent px-5 pt-12 pb-4 pointer-events-none">
                        <p className="text-white font-body font-medium text-[0.95rem] tracking-wide truncate">
                          {images[0].caption}
                        </p>
                      </div>
                    )}
                  </>
                );
                const className = "aspect-[4/3] relative overflow-hidden rounded-sm shadow-[0_20px_60px_rgba(40,41,54,0.12)] cursor-pointer group bg-gradient-to-br from-navy/5 to-gold/10 block";
                return images[0]?.href ? (
                  <Link href={images[0].href} className={className} aria-label={`View ${images[0].alt}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className} onClick={() => setSelectedImage(images[0]?.src)}>
                    {inner}
                  </div>
                );
              })()}
              {/* Corner accents */}
              <div className="absolute -top-3 -left-3 w-20 h-20 border-t-2 border-l-2 border-gold/30 rounded-tl-sm" />
              <div className="absolute -bottom-3 -right-3 w-20 h-20 border-b-2 border-r-2 border-gold/30 rounded-br-sm" />
            </div>
          </AnimatedSection>
        </div>

        {/* Image Grid */}
        <AnimatedSection delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.slice(1).map((image, index) => {
              const inner = (
                <>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized={!isOptimizableImageHost(image.src)}
                  />
                  {/* Persistent gradient at the bottom carries the
                      caption (service name). Always visible — no
                      hover gymnastics on mobile — but subtle enough
                      that the photo stays the focal point. */}
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy/90 via-navy/45 to-transparent px-3 pt-10 pb-2.5 pointer-events-none">
                      <p className="text-white font-body font-medium text-[0.78rem] tracking-wide leading-tight line-clamp-2">
                        {image.caption}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/15 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      {image.href ? (
                        <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                  </div>
                </>
              );
              const className = "relative aspect-square overflow-hidden rounded-sm cursor-pointer group bg-gradient-to-br from-navy/5 to-gold/10 block";
              return image.href ? (
                <Link key={index} href={image.href} className={className} aria-label={`View ${image.alt}`}>
                  {inner}
                </Link>
              ) : (
                <div
                  key={index}
                  className={className}
                  onClick={() => setSelectedImage(image.src)}
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </AnimatedSection>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 bg-navy/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            ref={closeRef}
            aria-label="Close lightbox"
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
              unoptimized={!isOptimizableImageHost(selectedImage)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
