import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import InstagramFeed from "@/components/InstagramFeed";
import BeforeAfterCarousel from "@/components/BeforeAfterCarousel";
import InspirationGallery from "@/components/InspirationGallery";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";

// Server-fetch the before/after pairs from the admin-managed gallery
// tables. Revalidates on the standard 60s window (same as the public
// gallery API) plus on-demand when the admin saves from /admin/gallery.
export const revalidate = 60;

interface DBPair {
  id: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  alt: string | null;
}

async function fetchPairs() {
  if (!hasSupabaseConfig) return [];
  try {
    const { data } = await supabase
      .from("gallery_before_after")
      .select("id, before_url, after_url, caption, alt, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return (data || []) as DBPair[];
  } catch {
    return [];
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
  const dbPairs = await fetchPairs();
  // Adapt DB shape to the component's prop shape. Keep the mapping here so
  // BeforeAfterCarousel stays dumb/pure and reusable from anywhere.
  const pairs = dbPairs.map((p) => ({
    before: p.before_url,
    after: p.after_url,
    caption: p.caption || undefined,
    alt: p.alt || undefined,
  }));
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Gallery />
        <InspirationGallery />
        {pairs.length > 0 && (
          <section className="py-20 md:py-24 bg-cream">
            <BeforeAfterCarousel pairs={pairs} title="Before & After" />
          </section>
        )}
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
