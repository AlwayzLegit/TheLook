import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LeaveReviewCTA from "@/components/LeaveReviewCTA";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getBranding, telHref } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Leave a Review",
    descriptionFor: (b) => `Share your experience at ${b.name} on Google or Yelp.`,
    canonical: "/review",
  });
}

export default async function ReviewPage() {
  const brand = await getBranding();
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Thank You</span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>
            <h1 className="font-heading text-5xl md:text-6xl mb-5">Share Your Experience</h1>
            <p className="text-navy/70 font-body font-light max-w-xl mx-auto">
              Reviews are how new clients find us and how our stylists know they&apos;re on the right track.
              Pick whichever platform you already use — it takes less than a minute.
            </p>
          </div>

          <LeaveReviewCTA variant="light" />

          <div className="mt-12 text-center">
            <p className="text-navy/70 text-xs tracking-[0.25em] uppercase font-body mb-3">
              Had an issue instead?
            </p>
            <p className="text-navy/70 font-body text-sm mb-4">
              We&apos;d rather hear it directly so we can make it right.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="border border-navy/20 hover:border-navy text-navy/70 hover:text-navy text-[11px] tracking-[0.2em] uppercase px-6 py-3 font-body transition-all"
              >
                Send us a message
              </Link>
              <a
                href={telHref(brand.phone)}
                className="border border-navy/20 hover:border-navy text-navy/70 hover:text-navy text-[11px] tracking-[0.2em] uppercase px-6 py-3 font-body transition-all"
              >
                Call the salon
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
