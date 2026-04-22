"use client";

import posthog from "posthog-js";

// Thin wrapper around posthog-js so pages don't each import the SDK
// directly. No-ops when PostHog hasn't initialised (env var missing /
// SSR / pre-load), so callers don't need to guard.

interface Props {
  [key: string]: string | number | boolean | null | undefined;
}

export function track(event: string, properties?: Props): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // swallow — analytics must never break the UX
  }
}

export function identify(distinctId: string, traits?: Props): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  if (!distinctId) return;
  try {
    posthog.identify(distinctId.toLowerCase(), traits);
  } catch {
    // swallow
  }
}

export function reset(): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  try {
    posthog.reset();
  } catch {
    // swallow
  }
}
