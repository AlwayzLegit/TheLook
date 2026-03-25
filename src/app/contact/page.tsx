import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";

export const metadata: Metadata = {
  title: "Contact | The Look Hair Salon",
  description:
    "Contact The Look Hair Salon — call (818) 662-5665, email thelook_hairsalon@yahoo.com, or visit us at 919 S Central Ave Suite #E, Glendale, CA 91204.",
};

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
