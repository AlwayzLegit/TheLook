import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import BeforeAfter from "@/components/BeforeAfter";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";

export const metadata: Metadata = {
  title: "Services & Pricing | The Look Hair Salon",
  description:
    "View our full service menu and pricing — haircuts, color, balayage, highlights, keratin, extensions, and more at The Look Hair Salon in Glendale, CA.",
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Services />
        <BeforeAfter />
        <FAQ />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
