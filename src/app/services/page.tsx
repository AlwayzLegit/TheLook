import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getBranding } from "@/lib/branding";
import { buildFaqs } from "@/lib/faqs";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Services & Pricing",
    descriptionFor: (b) =>
      `View our full service menu and pricing — haircuts, color, balayage, highlights, keratin, extensions, and more at ${b.name} in Glendale, CA.`,
  });
}

export default async function ServicesPage() {
  const brand = await getBranding();
  const faqs = buildFaqs(brand.phone);
  const faqLd = faqJsonLd(faqs);
  const breadcrumbsLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Services", url: "/services" },
  ]);
  return (
    <>
      <Script
        id="ldjson-faq-services"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Script
        id="ldjson-breadcrumb-services"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
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
