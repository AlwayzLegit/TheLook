"use client";

import Link from "next/link";
import { useBranding } from "@/components/BrandingProvider";
import { telHref } from "@/lib/branding";

export default function BookingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const brand = useBranding();
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="w-8 h-[1px] bg-gold" />
          <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
            Booking Error
          </span>
          <span className="w-8 h-[1px] bg-gold" />
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-navy mb-6">
          Unable to Book
        </h1>
        <p className="text-navy/60 font-body font-light mb-4">
          We&apos;re having trouble with our booking system right now.
        </p>
        <p className="text-navy/60 font-body font-light mb-10">
          Please call us directly at{" "}
          <a href={telHref(brand.phone)} className="text-rose underline">
            {brand.phone}
          </a>{" "}
          to schedule your appointment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block border border-navy/20 text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-all duration-300 hover:border-navy cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(184,36,59,0.3)]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
