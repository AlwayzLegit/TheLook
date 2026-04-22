import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Contact",
    descriptionFor: (b) =>
      `Contact ${b.name} — call ${b.phone}, email ${b.email}, or visit us at ${b.address}.`,
  });
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Contact />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
