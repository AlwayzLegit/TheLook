"use client";

import { useEffect, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface Props {
  clientEmail: string;
  clientName: string;
  clientPhone?: string;
  description: string;
  onSuccess: (setupIntentId: string) => void;
}

let _stripePromise: Promise<Stripe | null> | null = null;
function getStripeBrowser(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!_stripePromise) _stripePromise = loadStripe(key);
  return _stripePromise;
}

function CardForm({
  setupIntentId,
  onSuccess,
}: {
  setupIntentId: string;
  onSuccess: (id: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeErr, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });

    if (stripeErr) {
      setError(stripeErr.message || "Could not save card.");
      setSubmitting(false);
      return;
    }

    if (setupIntent && setupIntent.status === "succeeded") {
      onSuccess(setupIntent.id);
      return;
    }

    // Fallback: use the id we had.
    onSuccess(setupIntentId);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-600 text-sm font-body">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full bg-navy text-white text-sm font-body uppercase tracking-widest py-3 hover:bg-navy/90 disabled:opacity-60 transition-colors"
      >
        {submitting ? "Saving..." : "Save card on file"}
      </button>
      <p className="text-xs text-navy/40 font-body text-center leading-relaxed">
        Your card won&apos;t be charged now. It&apos;s saved securely with Stripe so
        the salon can charge the 25% cancellation fee if you no-show or cancel
        within 24 hours.
      </p>
    </form>
  );
}

export default function SaveCardForm({
  clientEmail, clientName, clientPhone, description, onSuccess,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stripePromise = getStripeBrowser();

  useEffect(() => {
    if (!stripePromise || !clientEmail) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientEmail, clientName, clientPhone, description }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.clientSecret || !data.setupIntentId) {
          setLoadError(data.error || "Failed to initialize card form.");
          return;
        }
        setClientSecret(data.clientSecret);
        setSetupIntentId(data.setupIntentId);
      } catch {
        if (!cancelled) setLoadError("Failed to initialize card form.");
      }
    })();
    return () => { cancelled = true; };
  }, [clientEmail, clientName, clientPhone, description, stripePromise]);

  if (!stripePromise) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 font-body text-sm">
        Card payments aren&apos;t configured on this site. Call (818) 662-5665
        to secure your appointment.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-body text-sm">
        {loadError}
      </div>
    );
  }

  if (!clientSecret || !setupIntentId) {
    return (
      <div className="p-4 text-navy/50 font-body text-sm text-center">
        Loading secure card form…
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <CardForm setupIntentId={setupIntentId} onSuccess={onSuccess} />
    </Elements>
  );
}
