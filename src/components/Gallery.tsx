"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

// The gallery is now admin-managed via /admin/gallery. The public
// component fetches /api/gallery/public on mount and renders whatever
// active rows are in the DB. The old hardcoded array is kept below as
// a static fallback so the page never renders empty when Supabase is
// unreachable or the tables haven't been migrated yet.

interface GalleryItem {
  id?: string;
  image_url?: string;
  image?: string;
  title: string | null | string;
  caption?: string | null;
  stylist_id?: string | null;
  // Legacy field name kept so the fallback array below still types cleanly.
  category?: string;
}

interface GalleryProps {
  // When provided, Gallery skips its own fetch and renders only these
  // items. Lets a parent component (GalleryWithStylistFilter on /gallery)
  // own the filter state without Gallery duplicating the network call.
  items?: GalleryItem[];
  // Optional override on the heading rendered above the grid. Falls
  // back to "Gallery" so the home-page usage stays identical.
  heading?: string | null;
}

const fallbackItems: GalleryItem[] = [
  { title: "Balayage Transformation", caption: "Color",   image: "/images/gallery/gallery-01.jpg" },
  { title: "Precision Cut & Style",   caption: "Cut",     image: "/images/gallery/gallery-02.jpg" },
  { title: "Color & Highlights",      caption: "Color",   image: "/images/gallery/gallery-03.jpg" },
  { title: "Blonde Highlights",       caption: "Color",   image: "/images/gallery/gallery-04.jpg" },
  { title: "Hair Styling",            caption: "Styling", image: "/images/gallery/gallery-05.jpg" },
  { title: "Vivid Color",             caption: "Color",   image: "/images/gallery/gallery-06.jpg" },
  { title: "Textured Layers",         caption: "Cut",     image: "/images/gallery/gallery-07.jpg" },
  { title: "Ombré",                   caption: "Color",   image: "/images/gallery/gallery-08.jpg" },
  { title: "Full Color",              caption: "Color",   image: "/images/gallery/gallery-09.jpg" },
  { title: "Blowout & Style",         caption: "Styling", image: "/images/gallery/gallery-10.jpg" },
  { title: "Color Correction",        caption: "Color",   image: "/images/gallery/gallery-11.jpg" },
  { title: "Cut & Color",             caption: "Color",   image: "/images/gallery/gallery-12.jpg" },
];

function srcOf(item: GalleryItem): string {
  return item.image_url || item.image || "";
}

function labelOf(item: GalleryItem): string {
  return (item.caption || item.category || "").toString();
}

export default function Gallery({ items: itemsProp, heading }: GalleryProps = {}) {
  const [fetchedItems, setFetchedItems] = useState<GalleryItem[]>(fallbackItems);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Either render externally-supplied items (filter parent owns the
  // data) or self-fetch on mount. Standalone home-page usage keeps the
  // self-fetch behaviour exactly as before.
  const externallyControlled = Array.isArray(itemsProp);
  const items = externallyControlled ? (itemsProp as GalleryItem[]) : fetchedItems;

  useEffect(() => {
    if (externallyControlled) return;
    let cancelled = false;
    fetch("/api/gallery/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: GalleryItem[] } | null) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.items) && data.items.length > 0) {
          setFetchedItems(data.items);
        }
      })
      .catch(() => {
        // Keep fallback array — never render empty.
      });
    return () => { cancelled = true; };
  }, [externallyControlled]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    triggerRef.current?.focus();
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % items.length : null
    );
  }, [items.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + items.length) % items.length
        : null
    );
  }, [items.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  const activeItem = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <section id="gallery" className="py-24 md:py-32 bg-cream relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(196,162,101,0.06)_0%,transparent_60%)]" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              A Glimpse of Our Work
            </span>
            <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl mb-5">{heading ?? "Gallery"}</h2>
          <p className="text-navy/75 font-body">
            Check out our Instagram for the most recent transformations
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((item, index) => {
            const src = srcOf(item);
            const label = labelOf(item);
            return (
              <AnimatedSection key={item.id || src || index} delay={index * 0.04}>
                <button
                  ref={(el) => { if (lightboxIndex === null) triggerRef.current = el; }}
                  onClick={() => { triggerRef.current = document.activeElement as HTMLButtonElement; setLightboxIndex(index); }}
                  aria-label={`Open ${item.title || label || "gallery image"} in lightbox`}
                  className="group relative aspect-square overflow-hidden cursor-pointer w-full rounded-sm bg-gradient-to-br from-navy/5 to-gold/10"
                >
                  <Image
                    src={src}
                    alt={`${item.title || label || "Salon work"} — The Look Hair Salon`}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-110"
                    unoptimized={src.startsWith("http")}
                  />
                  {/* Improved hover overlay with gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-end pb-5">
                    {item.title ? <p className="font-heading text-base text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-500">{item.title}</p> : null}
                    {label ? <p className="text-gold text-xs mt-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-500 delay-75">{label}</p> : null}
                  </div>
                </button>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection className="text-center mt-12">
          <a
            href="https://www.instagram.com/thelookhairsalon/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-navy/70 hover:text-rose transition-all duration-300 text-[11px] tracking-[0.2em] uppercase font-body group"
          >
            See more on Instagram
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </AnimatedSection>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
            className="fixed inset-0 bg-charcoal/95 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 200 }}
            onClick={closeLightbox}
          >
            <button ref={closeButtonRef} onClick={closeLightbox} aria-label="Close lightbox" className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10">
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
              <Image
                src={srcOf(activeItem)}
                alt={(activeItem.title || labelOf(activeItem) || "Gallery image")}
                fill
                className="object-contain"
                unoptimized={srcOf(activeItem).startsWith("http")}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent p-6">
                {activeItem.title ? <p className="font-heading text-xl text-white">{activeItem.title}</p> : null}
                {labelOf(activeItem) ? <p className="text-gold text-sm font-body">{labelOf(activeItem)}</p> : null}
              </div>
            </motion.div>
            <button onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-body tracking-wider">
              {(lightboxIndex ?? 0) + 1} / {items.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
