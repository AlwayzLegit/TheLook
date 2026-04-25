import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import GalleryWithStylistFilter from "@/components/GalleryWithStylistFilter";
import InstagramFeed from "@/components/InstagramFeed";
import InspirationGallery from "@/components/InspirationGallery";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";

// Server-fetch every input GalleryWithStylistFilter needs in one pass:
// items, before/after pairs, and the stylist roster used by the filter
// dropdown. ISR @ 60s matches the public API; the client component then
// owns filter state via the URL.
export const revalidate = 60;

interface ItemRow {
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

interface StylistRow {
  id: string;
  name: string;
  slug: string;
}

async function fetchAll(): Promise<{ items: ItemRow[]; pairs: PairRow[]; stylists: StylistRow[] }> {
  if (!hasSupabaseConfig) return { items: [], pairs: [], stylists: [] };
  try {
    const [itemsRes, pairsRes, stylistsRes] = await Promise.all([
      supabase
        .from("gallery_items")
        .select("id, image_url, title, caption, stylist_id, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("gallery_before_after")
        .select("id, before_url, after_url, caption, alt, stylist_id, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("stylists")
        .select("id, name, slug")
        .eq("active", true)
        .neq("id", BOOKING.ANY_STYLIST_ID)
        .not("name", "ilike", "any stylist")
        .order("sort_order", { ascending: true }),
    ]);

    // Pre-migration safety: if stylist_id column hasn't been added yet
    // (20260511 not run), retry the gallery selects without it. The
    // filter dropdown falls back to "no taggable stylists" automatically.
    let items: ItemRow[] = (itemsRes.data as ItemRow[]) || [];
    let pairs: PairRow[] = (pairsRes.data as PairRow[]) || [];
    if (itemsRes.error && /stylist_id/i.test(itemsRes.error.message || "")) {
      const retry = await supabase
        .from("gallery_items")
        .select("id, image_url, title, caption, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      items = ((retry.data || []) as Omit<ItemRow, "stylist_id">[]).map((r) => ({
        ...r,
        stylist_id: null,
      }));
    }
    if (pairsRes.error && /stylist_id/i.test(pairsRes.error.message || "")) {
      const retry = await supabase
        .from("gallery_before_after")
        .select("id, before_url, after_url, caption, alt, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      pairs = ((retry.data || []) as Omit<PairRow, "stylist_id">[]).map((r) => ({
        ...r,
        stylist_id: null,
      }));
    }
    return {
      items,
      pairs,
      stylists: (stylistsRes.data as StylistRow[]) || [],
    };
  } catch {
    return { items: [], pairs: [], stylists: [] };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Gallery",
    descriptionFor: (b) =>
      `Browse our gallery of hair transformations — balayage, highlights, color corrections, precision cuts, and styling at ${b.name} in Glendale, CA.`,
  });
}

export default async function GalleryPage() {
  const { items, pairs, stylists } = await fetchAll();
  return (
    <>
      <Navbar />
      <main className="pt-20">
        {/* Suspense boundary required because GalleryWithStylistFilter
            calls useSearchParams() to read ?stylist=... — without this,
            Next.js can't prerender /gallery statically. */}
        <Suspense fallback={null}>
          <GalleryWithStylistFilter
            initialItems={items}
            initialPairs={pairs}
            stylists={stylists}
          />
        </Suspense>
        <InspirationGallery />
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
