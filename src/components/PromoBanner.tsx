"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("thelook_promo_dismissed");
      if (!dismissed) setIsVisible(true);
    } catch {
      setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem("thelook_promo_dismissed", Date.now().toString());
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-navy-light text-white relative z-50"
      >
        <div className="max-w-7xl mx-auto px-8 py-2.5 flex items-center justify-center gap-4 text-[11px] tracking-[0.15em] uppercase font-body">
          <span className="text-gold">&#9670;</span>
          <p className="text-white/50">
            New Client Special: <span className="text-white/80">20% off your first visit</span>
            {" "}&middot;{" "}
            <Link href="/book" className="text-gold hover:text-gold-light transition-colors">
              Book now
            </Link>
          </p>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
