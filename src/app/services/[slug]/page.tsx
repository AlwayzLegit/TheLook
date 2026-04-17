import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ServiceCategory from "@/components/ServiceCategory";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { SERVICE_CATEGORIES, getCategoryBySlug } from "@/lib/service-categories";

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

  return {
    title: `${category.title} | The Look Hair Salon`,
    description: category.description,
  };
}

export default async function ServiceCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="pt-20">
        <ServiceCategory category={category} />
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
