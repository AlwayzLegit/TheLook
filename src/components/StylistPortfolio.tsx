"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { isOptimizableImageHost } from "@/lib/imageHosts";

// Curated "Selected work" rail for /team/<slug>. Mixes single gallery
// items + before/after pairs into one chronologically-sorted strip,
// capped at MAX_TILES so the section feels editorial rather than a
// dump. Click → lightbox (same UX as the main /gallery page).

const MAX_TILES = 6;
const MIN_TILES_TO_SHOW = 3;

interface Item {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
}

interface Pair {
  id: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  alt: string | null;
}

interface Props {
  stylistName: string;
  stylistSlug: string;
  items: Item[];
  pairs: Pair[];
}

type Tile =
  | { kind: "single"; id: string; src: string; title: string | null; caption: string | null }
  | {
      kind: "pair";
      id: string;
      before: string;
      after: string;
      caption: string | null;
      alt: string | null;
    };

function buildTiles(items: Item[], pairs: Pair[]): Tile[] {
  const singles: Tile[] = items.map((it) => ({
    kind: "single",
    id: it.id,
    src: it.image_url,
    title: it.title,
    caption: it.caption,
  }));
  const paired: Tile[] = pairs.map((p) => ({
    kind: "pair",
    id: p.id,
    before: p.before_url,
    after: p.after_url,
    caption: p.caption,
    alt: p.alt,
  }));
  // Interleave singles + pairs so the layout stays varied. Cap.
  const interleaved: Tile[] = [];
  const max = Math.max(singles.length, paired.length);
  for (let i = 0; i < max && interleaved.length < MAX_TILES; i++) {
    if (i < singles.length && interleaved.length < MAX_TILES) interleaved.push(singles[i]);
    if (i < paired.length && interleaved.length < MAX_TILES) interleaved.push(paired[i]);
  }
  return interleaved;
}

export default function StylistPortfolio({ stylistName, stylistSlug, items, pairs }: Props) {
  const tiles = buildTiles(items, pairs);
  const [active, setActive] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setActive(null), []);
  const next = useCallback(
    () => setActive((i) => (i === null ? null : (i + 1) % tiles.length)),
    [tiles.length],
  );
  const prev = useCallback(
    () => setActive((i) => (i === null ? null : (i - 1 + tiles.length) % tiles.length)),
    [tiles.length],
  );

  useEffect(() => {
    if (active === null) return;
    closeButtonRef.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [active, close, next, prev]);

  if (tiles.length < MIN_TILES_TO_SHOW) return null;

  const activeTile = active !== null ? tiles[active] : null;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-[1px] bg-gold" />
          <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
            Selected work
          </span>
        </div>
        <Link
          href={`/gallery?stylist=${stylistSlug}`}
          className="text-[11px] tracking-[0.2em] uppercase font-body text-navy/70 hover:text-rose transition-colors"
        >
          See all gallery →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {tiles.map((tile, idx) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => setActive(idx)}
            aria-label={
              tile.kind === "single"
                ? `Open ${tile.title || "work sample"} in lightbox`
                : `Open before-and-after in lightbox`
            }
            className="group relative aspect-square overflow-hidden bg-cream-dark rounded-sm"
          >
            {tile.kind === "single" ? (
              <Image
                src={tile.src}
                alt={tile.title || tile.caption || `Work by ${stylistName}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                unoptimized={!isOptimizableImageHost(tile.src)}
              />
            ) : (
              // Slim two-up rendering for before/after — same square
              // outer footprint as singles so the grid rhythm stays
              // consistent. Hover reveals a "Before · After" label.
              <div className="grid grid-cols-2 h-full w-full">
                <div className="relative">
                  <Image
                    src={tile.before}
                    alt={`Before — ${tile.alt || ""}`}
                    fill
                    sizes="(max-width: 768px) 25vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    unoptimized={!isOptimizableImageHost(tile.before)}
                  />
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] tracking-[0.2em] uppercase font-body px-1.5 py-0.5">
                    Before
                  </span>
                </div>
                <div className="relative">
                  <Image
                    src={tile.after}
                    alt={`After — ${tile.alt || ""}`}
                    fill
                    sizes="(max-width: 768px) 25vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    unoptimized={!isOptimizableImageHost(tile.after)}
                  />
                  <span className="absolute bottom-1 left-1 bg-rose text-white text-[9px] tracking-[0.2em] uppercase font-body px-1.5 py-0.5">
                    After
                  </span>
                </div>
              </div>
            )}
            {tile.kind === "single" && (tile.title || tile.caption) && (
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <p className="font-heading text-sm text-white leading-tight">
                  {tile.title || tile.caption}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeTile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Portfolio lightbox"
            className="fixed inset-0 bg-charcoal/95 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 200 }}
            onClick={close}
          >
            <button
              ref={closeButtonRef}
              onClick={close}
              aria-label="Close lightbox"
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {tiles.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <motion.div
              key={active}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {activeTile.kind === "single" ? (
                <div className="relative w-full aspect-[3/4] md:aspect-[4/3] max-h-[80vh]">
                  <Image
                    src={activeTile.src}
                    alt={activeTile.title || activeTile.caption || `Work by ${stylistName}`}
                    fill
                    className="object-contain"
                    unoptimized={!isOptimizableImageHost(activeTile.src)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={activeTile.before}
                      alt={`Before — ${activeTile.alt || ""}`}
                      fill
                      className="object-contain"
                      unoptimized={!isOptimizableImageHost(activeTile.before)}
                    />
                    <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] tracking-[0.2em] uppercase font-body px-2 py-1">
                      Before
                    </span>
                  </div>
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={activeTile.after}
                      alt={`After — ${activeTile.alt || ""}`}
                      fill
                      className="object-contain"
                      unoptimized={!isOptimizableImageHost(activeTile.after)}
                    />
                    <span className="absolute top-3 left-3 bg-rose text-white text-[10px] tracking-[0.2em] uppercase font-body px-2 py-1">
                      After
                    </span>
                  </div>
                </div>
              )}
              {((activeTile.kind === "single" && (activeTile.title || activeTile.caption)) ||
                (activeTile.kind === "pair" && activeTile.caption)) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent p-6">
                  {activeTile.kind === "single" ? (
                    <>
                      {activeTile.title && (
                        <p className="font-heading text-xl text-white">{activeTile.title}</p>
                      )}
                      {activeTile.caption && (
                        <p className="text-gold text-sm font-body">{activeTile.caption}</p>
                      )}
                    </>
                  ) : (
                    <p className="font-heading text-xl text-white">{activeTile.caption}</p>
                  )}
                </div>
              )}
            </motion.div>
            {tiles.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-body tracking-wider">
              {(active ?? 0) + 1} / {tiles.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
