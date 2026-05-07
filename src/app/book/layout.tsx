import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

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

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
