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
import { track } from "@/lib/analytics";

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
  phone,
}: {
  // amountCents is the TOTAL customer pays (deposit base + CC surcharge).
  // The DepositForm parent already combined both before passing in.
  amountCents: number;
  paymentIntentId: string;
  onSuccess: (id: string) => void;
  phone: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Count card declines so we can escalate to the "call to pay" escape
  // after two consecutive failures — before this the customer could hit
  // the same error forever with no out.
  const [failCount, setFailCount] = useState(0);

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
      setError(stripeErr.message || "Payment failed. Please check your card details and try again.");
      setFailCount((n) => n + 1);
      setSubmitting(false);
      track("deposit_failed", {
        code: stripeErr.code ?? null,
        type: stripeErr.type ?? null,
        decline_code: stripeErr.decline_code ?? null,
      });
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      track("deposit_succeeded", { amountCents });
      onSuccess(paymentIntent.id);
      return;
    }

    // Rare: "processing" — fall back to the id we already have.
    onSuccess(paymentIntentId);
  };

  const telUrl = phone ? telHref(phone) : null;

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded border border-red-200 bg-red-50 p-3 space-y-2 text-sm font-body"
        >
          <p className="text-red-700">{error}</p>
          {failCount >= 2 && telUrl ? (
            <p className="text-red-700/90">
              Still having trouble? Call us at{" "}
              <a href={telUrl} className="underline font-medium">{phone}</a>{" "}
              and we&apos;ll take the deposit over the phone — your booking slot is held.
            </p>
          ) : (
            <p className="text-red-700/80 text-xs">Edit the card details above and try again, or use a different card.</p>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full bg-navy text-white text-sm font-body uppercase tracking-widest py-3 hover:bg-navy/90 disabled:opacity-60 transition-colors min-h-[44px]"
      >
        {submitting
          ? "Processing..."
          : error
            ? `Retry — pay $${(amountCents / 100).toFixed(0)} deposit`
            : `Pay $${(amountCents / 100).toFixed(0)} deposit`}
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
  // CC surcharge breakdown. Resolves once /api/deposits responds with the
  // server-computed fee so we don't trust a client-side calc.
  const [feeCents, setFeeCents] = useState<number>(0);
  const [totalCents, setTotalCents] = useState<number>(amountCents);
  // Prefetch just the percentage so we can render the disclosure line
  // BEFORE the PaymentIntent resolves.
  const [feePct, setFeePct] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/deposits/fee-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { pct?: number } | null) => {
        if (cancelled || !data) return;
        if (typeof data.pct === "number") setFeePct(data.pct);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
        if (typeof data.ccFeeCents === "number") setFeeCents(data.ccFeeCents);
        if (typeof data.chargedTotalCents === "number") setTotalCents(data.chargedTotalCents);
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
    <div className="space-y-4">
      {/* Fee-breakdown box — only renders when a surcharge is configured.
          Falls back to a single-line total when pct=0. */}
      {feeCents > 0 || feePct > 0 ? (
        <div className="border border-navy/10 bg-cream/50 p-3 text-sm font-body text-navy/70 space-y-1">
          <div className="flex justify-between">
            <span>Deposit</span>
            <span className="font-medium">${(amountCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Card processing fee{feePct > 0 ? ` (${feePct}%)` : ""}</span>
            <span className="font-medium">${(feeCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-navy/10 font-semibold text-navy">
            <span>Total charged now</span>
            <span>${(totalCents / 100).toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-navy/50 pt-1">
            The deposit credits toward your service total at your appointment. The processing fee covers card-network costs and is non-refundable.
          </p>
        </div>
      ) : null}
      <Elements stripe={stripe} options={{ clientSecret, appearance: { theme: "stripe" } }}>
        <CardForm
          amountCents={totalCents}
          paymentIntentId={paymentIntentId}
          onSuccess={onSuccess}
          phone={brand.phone}
        />
      </Elements>
    </div>
  );
}
