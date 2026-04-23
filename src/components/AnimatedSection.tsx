"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: AnimatedSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  // Gate motion behind a mount flag to avoid React #418 — framer-motion's
  // motion.div serializes slightly differently between the SSR pass and
  // the first client render, which trips hydration. Static div until
  // mounted, then upgrade to the animated shell.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || prefersReducedMotion) {
    // No motion at all — render a static div so hydration matches the
    // SSR output exactly, and screen-reader / keyboard users (or anyone
    // with reduced-motion) don't get a flickering reveal animation.
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      // Initial opacity lifted from 0 → 0.3 + halved duration so the
      // page is readable immediately even with JS disabled / animations
      // off, and the reveal feels snappy instead of laggy. Viewport
      // margin widened so elements already in the initial viewport
      // don't stick at opacity 0.3 when users deep-link in.
      initial={{ opacity: 0.3, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
