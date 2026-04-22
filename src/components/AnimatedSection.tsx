"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

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

  if (prefersReducedMotion) {
    // No motion at all — render a static div so screen-reader +
    // keyboard users don't get a flickering reveal animation.
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
