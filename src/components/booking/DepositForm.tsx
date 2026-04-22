"use client";

import { useEffect, useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripeBrowser } from "@/lib/stripeBrowser";
import { useBranding } from "@/components/BrandingProvider";
import { telHref } from "@/lib/branding";

interface Props {
  amountCents: number;
  clientEmail: string;
  clientName: string;
  description: string;
  onSuccess: (paymentIntentId: string) => void;
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
  const brand = useBranding();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // null = config missing, "loading" = waiting on script, "failed" = retried
  // and gave up, Stripe instance = loaded.
  const [stripe, setStripe] = useState<Stripe | null | "failed" | "loading" | "not_configured">("loading");

  useEffect(() => {
    const promise = getStripeBrowser();
    if (!promise) {
      setStripe("not_configured");
      return;
    }
    let cancelled = false;
    promise.then(
      (s) => { if (!cancelled) setStripe(s); },
      () => { if (!cancelled) setStripe("failed"); },
    );
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (stripe === "loading" || stripe === "failed" || stripe === "not_configured" || stripe === null) return;
    if (!clientEmail) return;
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
  }, [amountCents, clientEmail, clientName, description, stripe]);

  if (stripe === null || stripe === "not_configured") {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 font-body text-sm">
        Card payments aren&apos;t configured on this site. Please call
        {" "}<a href={telHref(brand.phone)} className="underline">{brand.phone}</a>{" "}
        to pay the deposit by phone.
      </div>
    );
  }

  if (stripe === "failed") {
    return (
      <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 font-body text-sm space-y-2">
        <p className="font-bold">We&apos;re having trouble loading our payment system.</p>
        <p>
          Please try again in a moment, or call{" "}
          <a href={telHref(brand.phone)} className="underline">{brand.phone}</a>{" "}
          to pay the deposit by phone.
        </p>
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

  if (stripe === "loading" || !clientSecret || !paymentIntentId) {
    return (
      <div className="p-4 text-navy/50 font-body text-sm text-center">
        Loading secure payment form…
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <CardForm amountCents={amountCents} paymentIntentId={paymentIntentId} onSuccess={onSuccess} />
    </Elements>
  );
}
