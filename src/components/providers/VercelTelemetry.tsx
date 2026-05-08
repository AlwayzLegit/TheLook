"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Both @vercel/analytics and @vercel/speed-insights wrap themselves in
// <Suspense fallback={null}> around a useSearchParams() call. In Next 15
// that pattern emits a <template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING">
// marker into the SSR HTML which the client-rendered tree never produces —
// React's position-based hydration sees a mismatch and throws #418 on
// every page load. Since these components only do work in effects (their
// SSR output is null anyway), gate them behind a mounted flag so SSR and
// the first client render both emit nothing. After hydration, mount them
// for real and the Suspense+useSearchParams bailout no longer matters.
export function VercelTelemetry() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
