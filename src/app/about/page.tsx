import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import Team from "@/components/Team";
import YelpReviews from "@/components/YelpReviews";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "About & Team",
    descriptionFor: (b) =>
      `Meet the team at ${b.name} — family owned & operated since 2011 with over 25 years in the beauty industry. Located in Glendale, CA.`,
    canonical: "/about",
  });
}

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
