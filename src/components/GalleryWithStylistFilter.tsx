"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Gallery from "./Gallery";
import BeforeAfterCarousel from "./BeforeAfterCarousel";

// Wraps the public Gallery + BeforeAfter sections with a single
// stylist-filter dropdown. One filter feeds both sections so the page
// stays coherent — picking "Anna" narrows the main grid AND the
// before/after carousel at the same time. Inspiration is intentionally
// excluded (those are reference photos, not portfolio).
//
// URL state: ?stylist=<slug> persists the filter so deep-links from
// /team/<slug>'s "See all gallery →" land here pre-filtered.

interface GalleryItemRow {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  stylist_id: string | null;
  sort_order: number;
}

interface PairRow {
  id: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  alt: string | null;
  stylist_id: string | null;
  sort_order: number;
}

interface PublicStylist {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  initialItems: GalleryItemRow[];
  initialPairs: PairRow[];
  stylists: PublicStylist[];
}

export default function GalleryWithStylistFilter({ initialItems, initialPairs, stylists }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("stylist") || "";

  // Resolve slug → stylist id once. Slugs are stable + readable in the
  // URL; ids are what the rows are tagged with.
  const slugToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stylists) map.set(s.slug, s.id);
    return map;
  }, [stylists]);
  const idToSlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stylists) map.set(s.id, s.slug);
    return map;
  }, [stylists]);

  // Derive counts per stylist so the dropdown can show "Anna · 14".
  // Pairs count as one row each in this metric; the user just wants a
  // sense of how curated each stylist's work is.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const tally = (id: string | null) => {
      if (!id) return;
      map.set(id, (map.get(id) || 0) + 1);
    };
    for (const item of initialItems) tally(item.stylist_id);
    for (const pair of initialPairs) tally(pair.stylist_id);
    return map;
  }, [initialItems, initialPairs]);

  // Only show stylists who actually have at least one tagged photo —
  // the dropdown stays short, and Anna doesn't see empty entries for
  // stylists who haven't tagged anything yet.
  const filterableStylists = useMemo(
    () => stylists.filter((s) => (counts.get(s.id) || 0) > 0),
    [stylists, counts],
  );

  const [activeSlug, setActiveSlug] = useState<string>(
    initialSlug && filterableStylists.some((s) => s.slug === initialSlug) ? initialSlug : "",
  );
  const activeId = activeSlug ? slugToId.get(activeSlug) || null : null;

  // Sync the URL when the user picks a stylist. Uses replaceState so the
  // back button still goes to the previous page, not through every
  // filter toggle on /gallery.
  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (activeSlug) next.set("stylist", activeSlug);
    else next.delete("stylist");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug]);

  const filteredItems = useMemo(() => {
    if (!activeId) return initialItems;
    return initialItems.filter((it) => it.stylist_id === activeId);
  }, [initialItems, activeId]);

  const filteredPairs = useMemo(() => {
    if (!activeId) return initialPairs;
    return initialPairs.filter((p) => p.stylist_id === activeId);
  }, [initialPairs, activeId]);

  const activeStylist = activeId ? stylists.find((s) => s.id === activeId) : null;

  // Hide the filter UI entirely if no stylist has tagged photos yet —
  // shows up as a normal /gallery page on a fresh install.
  const showFilter = filterableStylists.length > 0;

  // Map fetched rows into the prop shape Gallery + BeforeAfter expect.
  const galleryItems = filteredItems.map((it) => ({
    id: it.id,
    image_url: it.image_url,
    title: it.title,
    caption: it.caption,
    stylist_id: it.stylist_id,
  }));
  const carouselPairs = filteredPairs.map((p) => ({
    before: p.before_url,
    after: p.after_url,
    caption: p.caption || undefined,
    alt: p.alt || undefined,
  }));

  return (
    <>
      {/* Filter rail. Tucked at the top of the gallery section so it's
          discoverable but doesn't dominate. Hides itself when there's
          nothing to filter. */}
      {showFilter && (
        <div className="bg-cream py-6 border-b border-navy/5">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-end gap-3 flex-wrap">
            <label
              htmlFor="gallery-stylist-filter"
              className="text-[11px] tracking-[0.3em] uppercase font-body text-navy/50"
            >
              Filter by
            </label>
            <select
              id="gallery-stylist-filter"
              value={activeSlug}
              onChange={(e) => setActiveSlug(e.target.value)}
              className="border border-navy/20 bg-white px-3 py-2 text-sm font-body text-navy focus:outline-none focus:border-navy"
            >
              <option value="">All work</option>
              {filterableStylists.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name} · {counts.get(s.id) || 0}
                </option>
              ))}
            </select>
            {activeStylist && (
              <button
                type="button"
                onClick={() => setActiveSlug("")}
                className="text-xs font-body text-navy/60 hover:text-navy underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <Gallery items={galleryItems} />

      {carouselPairs.length > 0 && (
        <section className="py-20 md:py-24 bg-cream">
          <BeforeAfterCarousel
            pairs={carouselPairs}
            title={activeStylist ? `${activeStylist.name} — Before & After` : "Before & After"}
          />
        </section>
      )}

      {showFilter && activeStylist && filteredItems.length === 0 && carouselPairs.length === 0 && (
        <p className="text-center text-navy/50 font-body text-sm py-12">
          No work tagged for {activeStylist.name} yet.
        </p>
      )}
    </>
  );
}
