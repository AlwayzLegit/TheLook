"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

// Trend / style-reference tiles curated by the owner. Renders as a
// filterable grid: two axes — gender ("women" / "men" / "unisex") and
// category ("cut" / "color" / "styling" / "treatment"). The "All" chip
// for each axis is implicit.
//
// Data is public, loaded via /api/gallery/public (same endpoint as the
// other gallery sections). When the table hasn't migrated or there are
// no rows, the whole section hides — never shows an empty skeleton.

interface InspirationRow {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  category: string | null;
  gender: string | null;
  source: string | null;
  sort_order: number;
}

const GENDER_CHIPS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "unisex", label: "Unisex" },
];

const CATEGORY_CHIPS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "cut", label: "Cuts" },
  { value: "color", label: "Color" },
  { value: "styling", label: "Styling" },
  { value: "treatment", label: "Treatments" },
];

export default function InspirationGallery() {
  const [rows, setRows] = useState<InspirationRow[] | null>(null);
  const [gender, setGender] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gallery/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { inspiration?: InspirationRow[] } | null) => {
        if (cancelled || !data) return;
        setRows(Array.isArray(data.inspiration) ? data.inspiration : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      const genderMatch = gender === "all" || (r.gender || "unisex") === gender;
      const catMatch = category === "all" || r.category === category;
      return genderMatch && catMatch;
    });
  }, [rows, gender, category]);

  // Hide entirely if there's nothing published yet — avoids a sad empty
  // section the first time the /gallery page loads after the table is
  // created but before the owner uploads anything.
  if (rows && rows.length === 0) return null;

  return (
    <section id="inspiration" className="py-24 md:py-32 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(196,162,101,0.05)_0%,transparent_60%)]" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              Current Trends
            </span>
            <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl mb-4">Inspiration</h2>
          <p className="text-navy/60 font-body max-w-xl mx-auto">
            Browse the cuts, colors, and styles we love right now. Bring a favorite to your next appointment.
          </p>
        </AnimatedSection>

        {/* Filter chips — two rows so small phones don't line-wrap to
            something weird. aria-pressed carries the selected state for
            assistive tech. */}
        <div className="flex flex-col items-center gap-2 mb-8" role="group" aria-label="Filter inspiration gallery">
          <div className="flex flex-wrap justify-center gap-2">
            {GENDER_CHIPS.map((c) => (
              <button
                key={`g-${c.value}`}
                type="button"
                onClick={() => setGender(c.value)}
                aria-pressed={gender === c.value}
                className={`min-h-[36px] px-4 py-1.5 text-[11px] tracking-[0.2em] uppercase font-body border transition-colors ${
                  gender === c.value
                    ? "bg-navy text-white border-navy"
                    : "border-navy/20 text-navy/70 hover:border-navy/50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORY_CHIPS.map((c) => (
              <button
                key={`c-${c.value}`}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
                className={`min-h-[36px] px-4 py-1.5 text-[11px] tracking-[0.2em] uppercase font-body border transition-colors ${
                  category === c.value
                    ? "bg-gold/90 text-navy border-gold/90"
                    : "border-navy/15 text-navy/60 hover:border-navy/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {rows === null ? (
          // Soft-skeleton placeholder only while the fetch is in flight.
          // 6 tiles is enough to reserve space and avoid CLS without
          // paying for a big layout thrash when the real rows arrive.
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-cream-dark animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-navy/50 font-body text-sm">
            Nothing matches these filters yet. Try a different combination.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((row, i) => {
              const src = row.image_url;
              const isExternal = /^https?:\/\//.test(src);
              const useUnoptimized =
                isExternal && !/\.supabase\.co\//.test(src) && !src.includes("images.unsplash.com");
              return (
                <AnimatedSection key={row.id} delay={Math.min(i * 0.03, 0.3)}>
                  <figure className="group relative aspect-[3/4] overflow-hidden bg-cream-dark">
                    <Image
                      src={src}
                      alt={row.title || row.caption || "Hair inspiration"}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      unoptimized={useUnoptimized}
                    />
                    {(row.title || row.caption) && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {row.title && (
                          <p className="font-heading text-sm md:text-base leading-tight">{row.title}</p>
                        )}
                        {row.caption && (
                          <p className="text-[11px] font-body text-white/80 mt-0.5 line-clamp-2">{row.caption}</p>
                        )}
                        {row.source && (
                          <p className="text-[10px] font-body text-white/50 mt-1">via {row.source}</p>
                        )}
                      </figcaption>
                    )}
                  </figure>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
