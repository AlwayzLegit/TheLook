import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import InstagramFeed from "@/components/InstagramFeed";
import BeforeAfterCarousel from "@/components/BeforeAfterCarousel";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { BEFORE_AFTER_PAIRS } from "@/lib/beforeAfterPairs";

export const metadata: Metadata = {
  title: "Gallery | The Look Hair Salon",
  description:
    "Browse our gallery of hair transformations — balayage, highlights, color corrections, precision cuts, and styling at The Look Hair Salon in Glendale, CA.",
};

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
