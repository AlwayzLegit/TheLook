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
  const canonical = `/services/${category.slug}`;
  const title = `${category.title} | ${brand.name}`;
  return {
    title,
    description: category.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: category.description,
      url: canonical,
      images: category.heroImage ? [{ url: category.heroImage, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: category.description,
      ...(category.heroImage ? { images: [category.heroImage] } : {}),
    },
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
        {/* Server-rendered editorial body. ServiceCategory loads its
            service list client-side, so without this block a no-JS
            crawler only sees the hero + ~40-word description — which
            tripped Low word count / Low text-to-HTML on every
            category page in the 2026-05-15 Semrush audit. Rendered
            here (server component) so the copy is in the static HTML. */}
        {category.longIntro && category.longIntro.length > 0 && (
          <section className="bg-white pb-16 md:pb-20">
            <div className="max-w-3xl mx-auto px-8 lg:px-12">
              <div className="border-t border-navy/10 pt-12">
                <h2 className="font-heading text-2xl md:text-3xl text-navy mb-6">
                  {category.title} at The Look Hair Salon, Glendale
                </h2>
                <div className="space-y-5">
                  {category.longIntro.map((para, i) => (
                    <p
                      key={i}
                      className="text-navy/80 font-body font-light text-[15px] leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
