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
import { BEFORE_AFTER_PAIRS } from "@/lib/beforeAfterPairs";

export default function Home() {
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
        <section className="py-24 md:py-32 bg-cream">
          <BeforeAfterCarousel
            pairs={BEFORE_AFTER_PAIRS}
            title="Before & After"
            subtitle="Real transformations from our chairs"
          />
        </section>
        <ServicesPreview />
        <YelpReviews />
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
