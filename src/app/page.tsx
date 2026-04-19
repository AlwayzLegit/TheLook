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
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";

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
        <ServicesPreview />
        <YelpReviews />
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
