"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-rose text-white relative z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center gap-3 text-sm font-body">
          <span className="text-gold">&#10038;</span>
          <p>
            <span className="font-bold">New Client Special:</span> 20% off your
            first visit!{" "}
            <a
              href="#contact"
              className="underline underline-offset-2 hover:text-gold transition-colors"
            >
              Book now
            </a>
          </p>
          <button
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss promotion"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
