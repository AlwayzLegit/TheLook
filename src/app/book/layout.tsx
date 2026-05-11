import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// /book is a "use client" page (needs Stripe + form state + URL params)
// so it can't export `metadata` directly. This server-side layout
// pipes the page's title + description + canonical through Next's
// metadata API instead. Sub-routes (/book/cancel, /book/reschedule,
// /book/waitlist) override this with their own layout.tsx since they
// are token-driven flow pages that should not be indexed.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Book an Appointment",
    descriptionFor: (b) =>
      `Book a haircut, color, balayage, or styling appointment at ${b.name} in Glendale, CA. Online booking — pick your service, stylist, and time slot.`,
    canonical: "/book",
  });
}

// Round-27 SEO audit (2026-05-11) flagged 181 unique /book?service=…
// query variants as "Missing h1". The page itself renders the heading
// inline at line 736, but the page is `"use client"` — Semrush's no-JS
// crawler evidently doesn't pick up the SSR'd h1 on query-string
// variants. Hoisting Navbar + the heading shell + Footer into this
// server-rendered layout puts the h1 in the static HTML for every
// /book* URL, before any JS executes.
export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <header className="max-w-4xl mx-auto px-6 text-center mb-8 md:mb-10">
          <h1 className="font-heading text-3xl md:text-4xl text-navy mb-2">
            Book an Appointment
          </h1>
          <p className="text-navy/70 font-body text-sm">
            Pick your service, stylist, and time slot — at The Look Hair
            Salon in Glendale, CA.
          </p>
        </header>
        {children}
      </main>
      <Footer />
    </>
  );
}
