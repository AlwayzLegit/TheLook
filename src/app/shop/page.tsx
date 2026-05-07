import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";
import { getBranding } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Shop",
    descriptionFor: (b) => `${b.name}'s product shop — curated professional haircare coming soon.`,
    canonical: "/shop",
    // /shop is a "Coming Soon" placeholder — SEO audit found it was
    // indexable and risked outranking real service pages on brand
    // queries. Flip back to indexable when the real shop ships.
    noindex: true,
  });
}

export default async function ShopPage() {
  const brand = await getBranding();
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              Coming Soon
            </span>
            <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>

          <h1 className="font-heading text-4xl md:text-5xl text-navy mb-6">
            Our Shop Is On The Way
          </h1>
          <p className="text-navy/70 font-body font-light text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            We&apos;re curating a selection of the professional-grade haircare
            products our stylists rely on — the same tools and treatments we
            use on you in the salon. Check back soon, or stop by and ask one
            of our stylists for a personal recommendation.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
            >
              Book an Appointment
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-navy/20 text-navy hover:border-navy/50 text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
            >
              Ask Us a Question
            </Link>
          </div>

          <div className="mt-16 pt-10 border-t border-navy/10 text-navy/70 font-body text-xs tracking-wider">
            {brand.address} · {brand.phone}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
