import Script from "next/script";
import Link from "next/link";
import { Suspense } from "react";
import BookingLoading from "./loading";
import BookingWizard from "@/components/booking/BookingWizard";
import { SERVICE_CATEGORIES } from "@/lib/service-categories";
import { getBranding, telHref } from "@/lib/branding";
import { faqJsonLd } from "@/lib/seo";

// Server Component. The page used to be `"use client"` end-to-end, so
// useSearchParams() forced a full-route CSR bailout and Next.js
// auto-attached X-Robots-Tag: noindex to the skeleton-only prerender
// (the booking page was effectively de-indexed for a long time —
// pre-dates the PR #50 middleware). Industry-standard App Router fix:
// the route is now a Server Component that server-renders real,
// indexable content + FAQPage JSON-LD, and the interactive flow is a
// client island (components/booking/BookingWizard) mounted under a
// <Suspense> boundary. The route prerenders, the noindex is gone, and
// the booking flow itself is byte-identical (moved verbatim).
//
// Booking metadata (title / description / canonical "/book") is set in
// book/layout.tsx, which also renders the Navbar, the <h1> header, and
// the Footer around this content.

export const revalidate = 3600;

// Booking-specific FAQ. Every Q/A is rendered visibly below AND fed
// into FAQPage JSON-LD verbatim — the two must match or Google
// suppresses the rich result (same rule the rest of the site follows).
const BOOKING_FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "Do I need an appointment, or do you take walk-ins?",
    answer:
      "Walk-ins are welcome whenever a chair is open, but booking online guarantees your preferred stylist and time — especially on Saturdays. The form on this page takes about a minute.",
  },
  {
    question: "Is a deposit required to book?",
    answer:
      "A $50 deposit is taken at booking for color services and any appointment over $100. It is credited toward your final bill and is refundable if you cancel at least 24 hours in advance.",
  },
  {
    question: "Will my appointment be confirmed right away?",
    answer:
      "Online bookings come in as pending. You'll get an email that your request was received, then a separate confirmation email once the salon reviews and locks in your slot — usually within a few hours.",
  },
  {
    question: "Can I pick a specific stylist?",
    answer:
      "Yes. After choosing your service you can select a specific stylist or leave it as “Any Stylist” and we'll match you with the best available team member for that service.",
  },
  {
    question: "How do I change or cancel my appointment?",
    answer:
      "Every confirmation email includes reschedule and cancel links. You can also call the salon directly — 24 hours' notice keeps your deposit fully refundable.",
  },
];

export default async function BookPage() {
  const brand = await getBranding();
  const faqLd = faqJsonLd(BOOKING_FAQS);

  return (
    <>
      <Script
        id="ldjson-booking-faq"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Interactive booking flow — client island. Suspense lets the
          server route prerender around it instead of CSR-bailing the
          whole page (which is what triggered the auto-noindex). */}
      <Suspense fallback={<BookingLoading />}>
        <BookingWizard />
      </Suspense>

      {/* Server-rendered, indexable content. Sits below the wizard so
          the booking UI stays the first thing a visitor sees, while
          crawlers get real content + internal links instead of an
          empty skeleton. */}
      <section className="max-w-4xl mx-auto px-6 pb-20 pt-4">
        <div className="border-t border-navy/10 pt-12 space-y-14">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl text-navy mb-6">
              How booking at {brand.name} works
            </h2>
            <ol className="space-y-4 text-navy/80 font-body text-[15px] leading-relaxed">
              <li>
                <strong className="text-navy">1. Pick your service.</strong>{" "}
                Choose from haircuts, color, styling, treatments, or facial
                services. Pricing and duration are shown as you go.
              </li>
              <li>
                <strong className="text-navy">2. Choose a stylist &amp; time.</strong>{" "}
                Select a specific stylist or “Any Stylist,” then a date and
                time from live availability.
              </li>
              <li>
                <strong className="text-navy">3. Confirm.</strong>{" "}
                Add your details, place the deposit if your service requires
                one, and you&apos;ll get an email confirmation once the salon
                reviews your request.
              </li>
            </ol>
          </div>

          <div>
            <h2 className="font-heading text-2xl md:text-3xl text-navy mb-2">
              What you can book
            </h2>
            <p className="text-navy/70 font-body text-sm mb-6">
              Browse the full menu and pricing for any category before you
              book.
            </p>
            <ul className="grid sm:grid-cols-2 gap-4">
              {SERVICE_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/services/${c.slug}`}
                    className="group block border border-navy/10 hover:border-navy/30 p-5 transition-colors"
                  >
                    <p className="font-heading text-lg text-navy group-hover:text-rose transition-colors">
                      {c.title}
                    </p>
                    <p className="text-navy/70 font-body text-sm mt-1">
                      {c.subtitle}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-2xl md:text-3xl text-navy mb-6">
              Booking FAQ
            </h2>
            <div className="divide-y divide-navy/10">
              {BOOKING_FAQS.map((f, i) => (
                <details
                  key={i}
                  className="group py-4"
                  {...(i === 0 ? { open: true } : {})}
                >
                  <summary className="font-heading text-base md:text-lg text-navy cursor-pointer list-none flex items-start justify-between gap-4">
                    <span>{f.question}</span>
                    <span
                      aria-hidden
                      className="text-gold text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-navy/75 font-body text-sm leading-relaxed mt-3 pr-8">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <p className="text-navy/60 font-body text-xs text-center">
            {brand.name} · {brand.address} ·{" "}
            <a
              href={telHref(brand.phone)}
              className="hover:text-rose transition-colors"
            >
              {brand.phone}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
