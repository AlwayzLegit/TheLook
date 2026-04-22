import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Services & Pricing",
    descriptionFor: (b) =>
      `View our full service menu and pricing — haircuts, color, balayage, highlights, keratin, extensions, and more at ${b.name} in Glendale, CA.`,
  });
}

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Services />
        <FAQ />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
