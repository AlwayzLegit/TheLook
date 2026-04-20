"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function CancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No cancellation token provided.");
      return;
    }

    fetch(`/api/appointments/${token}/cancel?token=${token}`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
          setMessage(data.message || "Appointment cancelled.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong.");
      });
  }, [token]);

  if (status === "loading") {
    return <p className="text-navy/50 font-body">Cancelling your appointment...</p>;
  }

  if (status === "success") {
    return (
      <>
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-3xl mb-4">Appointment Cancelled</h2>
        <p className="text-navy/70 font-body">
          {message} We&apos;d love to see you again — call us at (818) 662-5665 or visit our website to rebook.
        </p>
        <p className="text-navy/50 text-xs font-body mt-5 leading-relaxed">
          <strong className="text-navy/70">Deposit &amp; cancellation fee:</strong> if you paid a
          deposit and cancelled 24+ hours in advance, it&apos;ll be refunded to your original
          payment method. Cancellations within 24 hours forfeit the deposit and are subject to a
          25% cancellation fee.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="font-heading text-3xl mb-4">Oops</h2>
      <p className="text-navy/60 font-body">{message}</p>
    </>
  );
}

export default function CancelPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream flex items-center justify-center">
        <div className="max-w-md mx-auto px-6 text-center">
          <Suspense fallback={<p className="text-navy/50 font-body">Loading...</p>}>
            <CancelContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
