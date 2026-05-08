"use client";

import { useEffect, useState } from "react";
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

// PostHogPageView reads useSearchParams() which forces Next 15 to mark
// the surrounding tree as dynamic. Wrapping it in <Suspense> "fixes"
// the build error but emits a BAILOUT_TO_CLIENT_SIDE_RENDERING
// template into the SSR HTML — and then the client renders null, not
// the template. React detects the structural mismatch and fires
// hydration error #418 on every page load (see
// admin_log "client.hydration_mismatch", first reported 2026-04 era,
// rediagnosed by cowork 2026-05-07).
//
// Since PostHogPageView itself returns null and runs entirely inside
// useEffect, there's no need to render it during SSR at all. Gate
// it behind a mounted flag so SSR + first client render both emit
// nothing — matching markup, no bailout template, no #418. After the
// effect fires we render PostHogPageView as a normal client component
// and useSearchParams() works without needing Suspense.
function MountedPostHogPageView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <PostHogPageView />;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <MountedPostHogPageView />
      {children}
    </PHProvider>
  );
}
