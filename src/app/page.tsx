import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
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
        <Testimonials />
        <InstagramFeed />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
