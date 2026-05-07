"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-gold text-sm tracking-[0.3em] uppercase font-body mb-4">Error</p>
        <h1 className="font-heading text-4xl text-navy mb-4">Something went wrong</h1>
        <p className="text-navy/60 font-body mb-8">
          We&apos;re sorry — please try again. If the problem persists, give us a call at (818) 662-5665.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-navy/20 text-navy hover:bg-navy hover:text-white tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
          >
            Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-navy/30 text-xs font-mono">ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
