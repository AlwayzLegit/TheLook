"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="w-8 h-[1px] bg-gold" />
          <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
            Something Went Wrong
          </span>
          <span className="w-8 h-[1px] bg-gold" />
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-navy mb-6">
          Oops
        </h1>
        <p className="text-navy/60 font-body font-light mb-10">
          We encountered an unexpected error. Please try again or return to the
          home page.
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
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-all duration-300 hover:shadow-[var(--shadow-rose-cta)]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
