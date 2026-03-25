import PromoBanner from "@/components/PromoBanner";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import BeforeAfter from "@/components/BeforeAfter";
import Gallery from "@/components/Gallery";
import Testimonials from "@/components/Testimonials";
import Team from "@/components/Team";
import FAQ from "@/components/FAQ";
import InstagramFeed from "@/components/InstagramFeed";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";

export default function Home() {
  return (
    <>
      <PromoBanner />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <BeforeAfter />
        <Gallery />
        <Testimonials />
        <Team />
        <FAQ />
        <Contact />
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
