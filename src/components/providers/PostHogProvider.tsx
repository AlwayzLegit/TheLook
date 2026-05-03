"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

// PostHog analytics provider. Initialised on the client once, guarded by
// the env var so dev / preview branches without a key stay silent. We
// disable auto-capture of pageviews because Next.js App Router routes
// transition client-side without reloading — PostHogPageView below fires
// a $pageview on every pathname change instead.

function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest";
    if (!key) return;
    if (posthog.__loaded) return;

    // Round-18 Lighthouse fix: posthog.init eagerly downloads + executes
    // the recorder (~51 KB) and surveys (~33 KB) bundles, blocking the
    // main thread for 130-200 ms during initial paint. Defer init to
    // requestIdleCallback so it runs after FCP/LCP, with a setTimeout
    // fallback for browsers without the idle API (Safari < 15.4) and
    // so a busy main thread doesn't starve us out of analytics entirely.
    const start = () => {
      if (posthog.__loaded) return;
      posthog.init(key, {
        api_host: host,
        ui_host: "https://us.posthog.com",
        capture_pageview: false, // tracked manually below, App-Router-safe
        capture_pageleave: true,
        // Don't spawn person profiles for bots / anonymous visitors; only
        // once we call posthog.identify() (e.g. on booking/contact submit).
        person_profiles: "identified_only",
        loaded: (ph) => {
          if (process.env.NODE_ENV === "development") ph.debug(false);
        },
      });
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(start, { timeout: 2500 });
    } else {
      // Safari pre-15.4 fallback. 1500 ms is past TTI on a slow 4G
      // first-paint but still inside a typical session's first
      // interaction window.
      setTimeout(start, 1500);
    }
  }, []);
  return null;
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog.__loaded) return;
    let url = window.origin + pathname;
    const search = searchParams?.toString();
    if (search) url += `?${search}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
