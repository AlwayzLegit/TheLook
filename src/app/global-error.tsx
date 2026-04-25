"use client";

// App Router top-level error boundary. Captures errors that escape the
// page-level error.tsx (which only catches per-route segment errors).
// Required for Sentry to receive React rendering errors per
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
//
// global-error.tsx must define its own <html> + <body> because it
// replaces the root layout when it renders. next/link is intentionally
// not used here — at the time global-error renders the app shell may
// be in an inconsistent state, so a hard navigation is safer.

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-cream font-body p-6">
        <div className="max-w-md text-center">
          <p className="text-gold text-[11px] tracking-[0.3em] uppercase mb-4">
            Something went wrong
          </p>
          <h1 className="font-heading text-3xl text-navy mb-4">
            We&apos;re looking into it.
          </h1>
          <p className="text-navy/70 leading-relaxed mb-8">
            An unexpected error occurred. Our team has been notified. Please
            refresh the page or try again in a moment.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-colors"
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
