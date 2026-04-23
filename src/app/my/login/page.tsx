"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TurnstileField from "@/components/TurnstileField";

export default function ClientLoginPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/client-portal/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-md mx-auto px-6">
          <h1 className="font-heading text-4xl mb-3 text-center">Sign In</h1>
          <p className="text-navy/50 text-sm font-body text-center mb-10">
            Enter your email and we&apos;ll send you a secure sign-in link — no password needed.
          </p>

          {sent ? (
            <div className="bg-white border border-navy/10 p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-heading text-xl mb-2">Check your email</h2>
              <p className="text-navy/60 text-sm font-body">
                We sent a sign-in link to <strong>{email}</strong>. It&apos;s valid for 15 minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-navy/10 p-8 space-y-4">
              <div>
                <label className="block text-sm text-navy/60 mb-2 font-body">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose" />
              </div>
              {turnstileSiteKey ? (
                <div className="pt-2">
                  <TurnstileField siteKey={turnstileSiteKey} onTokenChange={setTurnstileToken} />
                </div>
              ) : null}
              {error && <p className="text-red-600 text-sm font-body">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !email || (!!turnstileSiteKey && !turnstileToken)}
                className="w-full bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-6 py-3 font-body"
              >
                {submitting ? "Sending..." : "Send Sign-In Link"}
              </button>
              <p className="text-xs text-navy/60 text-center font-body pt-2">
                You must have booked with us before to sign in.
              </p>
            </form>
          )}

          <p className="text-center mt-8 text-xs text-navy/60 font-body">
            <Link href="/book" className="text-rose hover:underline">First time? Book an appointment</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
