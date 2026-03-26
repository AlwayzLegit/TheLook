import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import Team from "@/components/Team";
import YelpReviews from "@/components/YelpReviews";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";

export const metadata: Metadata = {
  title: "About & Team | The Look Hair Salon",
  description:
    "Meet the team at The Look Hair Salon — family owned & operated since 2011 with over 25 years in the beauty industry. Located in Glendale, CA.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <About />
        <Team />
        <YelpReviews />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
