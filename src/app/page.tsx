import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import HaircutsGallery from "@/components/HaircutsGallery";
import ColorGallery from "@/components/ColorGallery";
import StylingGallery from "@/components/StylingGallery";
import TreatmentsGallery from "@/components/TreatmentsGallery";
import ServicesPreview from "@/components/ServicesPreview";
import YelpReviews from "@/components/YelpReviews";
import InstagramFeed from "@/components/InstagramFeed";
import BeforeAfterCarousel from "@/components/BeforeAfterCarousel";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getBranding } from "@/lib/branding";

export const revalidate = 60;

// Root layout already ships a generic rootMetadata(). Override here so the
// home page advertises a tighter, more conversion-friendly description +
// explicit canonical — matters for the URL most customers actually share.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBranding();
  return {
    title: `${brand.name} — Hair Salon in Glendale, CA`,
    description: `Book your next cut, color, balayage, or extension with ${brand.name} in Glendale. Family-owned since 2011.`,
    alternates: { canonical: "/" },
  };
}

interface DBPair {
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
      .select("before_url, after_url, caption, alt, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    const rows = (data || []) as DBPair[];
    return rows.map((p) => ({
      before: p.before_url,
      after: p.after_url,
      caption: p.caption || undefined,
      alt: p.alt || undefined,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const beforeAfter = await fetchPairs();
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <HaircutsGallery />
        <ColorGallery />
        <StylingGallery />
        <TreatmentsGallery />
        {beforeAfter.length > 0 && (
          <section className="py-24 md:py-32 bg-cream">
            <BeforeAfterCarousel
              pairs={beforeAfter}
              title="Before & After"
              subtitle="Real transformations from our chairs"
            />
          </section>
        )}
        <ServicesPreview />
        <YelpReviews />
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
