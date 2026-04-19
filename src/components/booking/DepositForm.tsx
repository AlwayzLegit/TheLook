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
  amountCents: number;
  clientEmail: string;
  clientName: string;
  description: string;
  onSuccess: (paymentIntentId: string) => void;
}

// Lazy-load Stripe.js exactly once per page load. Returns null while loading
// OR when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY isn't set, in which case the UI
// gracefully falls back to an explanation message.
let _stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!_stripePromise) _stripePromise = loadStripe(key);
  return _stripePromise;
}

function CardForm({
  amountCents,
  paymentIntentId,
  onSuccess,
}: {
  amountCents: number;
  paymentIntentId: string;
  onSuccess: (id: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    // We take the PaymentIntent all the way to success here instead of doing
    // a redirect — the customer stays on the booking page, and we hand the
    // intent id back up to the parent so it gets attached to the
    // appointment POST.
    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });

    if (stripeErr) {
      setError(stripeErr.message || "Payment failed.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
      return;
    }

    // Rare: "processing" — fall back to the id we already have.
    onSuccess(paymentIntentId);
  };

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-600 text-sm font-body">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full bg-navy text-white text-sm font-body uppercase tracking-widest py-3 hover:bg-navy/90 disabled:opacity-60 transition-colors"
      >
        {submitting ? "Processing..." : `Pay $${(amountCents / 100).toFixed(0)} deposit`}
      </button>
    </form>
  );
}

export default function DepositForm({
  amountCents, clientEmail, clientName, description, onSuccess,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stripePromise = getStripe();

  useEffect(() => {
    if (!stripePromise || !clientEmail) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/deposits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents, clientEmail, clientName, description }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.clientSecret || !data.paymentIntentId) {
          setLoadError(data.error || "Failed to initialize payment.");
          return;
        }
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      } catch {
        if (!cancelled) setLoadError("Failed to initialize payment.");
      }
    })();
    return () => { cancelled = true; };
  }, [amountCents, clientEmail, clientName, description, stripePromise]);

  if (!stripePromise) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 font-body text-sm">
        Card payments aren&apos;t configured on this site. Please call
        (818) 662-5665 to pay the deposit by phone.
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

  if (!clientSecret || !paymentIntentId) {
    return (
      <div className="p-4 text-navy/50 font-body text-sm text-center">
        Loading secure payment form…
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <CardForm amountCents={amountCents} paymentIntentId={paymentIntentId} onSuccess={onSuccess} />
    </Elements>
  );
}
