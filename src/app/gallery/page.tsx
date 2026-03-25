import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import InstagramFeed from "@/components/InstagramFeed";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";

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
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
