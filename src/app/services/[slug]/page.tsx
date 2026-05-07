import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ServiceCategory from "@/components/ServiceCategory";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { SERVICE_CATEGORIES, getCategoryBySlug } from "@/lib/service-categories";
import { getBranding } from "@/lib/branding";
import { breadcrumbJsonLd } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SERVICE_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const brand = await getBranding();
  return {
    title: `${category.title} | ${brand.name}`,
    description: category.description,
  };
}

export default async function ServiceCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const breadcrumbsLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Services", url: "/services" },
    { name: category.title, url: `/services/${category.slug}` },
  ]);

  return (
    <>
      <Script
        id="ldjson-breadcrumb-service-category"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <Navbar />
      <main className="pt-20">
        <ServiceCategory category={category} />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
