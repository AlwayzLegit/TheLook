import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import InstagramFeed from "@/components/InstagramFeed";
import BeforeAfterCarousel from "@/components/BeforeAfterCarousel";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { BEFORE_AFTER_PAIRS } from "@/lib/beforeAfterPairs";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Gallery",
    descriptionFor: (b) =>
      `Browse our gallery of hair transformations — balayage, highlights, color corrections, precision cuts, and styling at ${b.name} in Glendale, CA.`,
  });
}

export default function GalleryPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Gallery />
        <section className="py-20 md:py-24 bg-cream">
          <BeforeAfterCarousel pairs={BEFORE_AFTER_PAIRS} title="Before & After" />
        </section>
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
