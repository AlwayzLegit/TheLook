"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Shared loader for Stripe.js with a timeout + one retry. Without this,
// Stripe.js can hang on flaky network or ad-blockers and leave the booking
// page stuck on the spinner. We surface a clean failure path instead so the
// fallback "call us" UI can render.
const TIMEOUT_MS = 10_000;

let _promise: Promise<Stripe | null> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Stripe.js load timed out")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function loadOnce(key: string): Promise<Stripe | null> {
  return await withTimeout(loadStripe(key), TIMEOUT_MS);
}

// Returns the Stripe.js handle, or null when the publishable key isn't
// configured at build time. Throws when the script fails to load after the
// retry — the caller renders the "call us" fallback.
export function getStripeBrowser(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (_promise) return _promise;
  _promise = (async () => {
    try {
      return await loadOnce(key);
    } catch {
      // One retry, then throw so the form can show a fallback.
      try {
        return await loadOnce(key);
      } catch (err) {
        // Reset so a future remount can try again.
        _promise = null;
        throw err;
      }
    }
  })();
  return _promise;
}
