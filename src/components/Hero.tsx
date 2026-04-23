"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useBranding } from "./BrandingProvider";
import { telHref } from "@/lib/branding";

export default function Hero() {
  const brand = useBranding();
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  // Gate the motion transforms behind a mount flag. Framer-motion's
  // MotionValue serialization differs between the SSR pass and the first
  // client render (React #418 hydration mismatch), so we render a static
  // frame until after hydration completes — then upgrade to the parallax.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  // When the user prefers reduced motion, pin the parallax layer —
  // useScroll still runs but we drop the transform so there's no
  // frame-by-frame movement.
  const y = (!mounted || prefersReducedMotion) ? "0%" : rawY;
  const opacity = (!mounted || prefersReducedMotion) ? 1 : rawOpacity;

  return (
    <section
      ref={ref}
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y }}>
        <Image
          src="/images/hero/salon-main.jpg"
          alt={brand.name}
          fill
          className="object-cover scale-105"
          priority
        />
      </motion.div>

      {/* Rich gradient overlay with warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-navy/50 to-charcoal/85" />

      {/* Subtle radial glow behind content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,162,101,0.08)_0%,transparent_70%)]" />

      <motion.div style={{ opacity }} className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center justify-center gap-5 mb-8"
        >
          <span className="w-12 h-[1px] bg-gradient-to-r from-transparent to-gold/60" />
          <span className="text-gold text-[11px] tracking-[0.35em] uppercase font-body">
            Est. 2011 &middot; Glendale, CA
          </span>
          <span className="w-12 h-[1px] bg-gradient-to-l from-transparent to-gold/60" />
        </motion.div>

        {/* Welcome headline — the navbar already shows the logo, so the hero
            opens with a warmer welcome message instead of repeating the brand. */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-heading text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-5 leading-[1.15]"
        >
          <span className="text-shimmer">Hair Salon in Glendale</span>
        </motion.h1>

        {/* Ornamental divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <span className="w-12 h-[1px] bg-gradient-to-r from-transparent to-gold/60" />
          <svg className="w-3 h-3 text-gold/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span className="w-12 h-[1px] bg-gradient-to-l from-transparent to-gold/60" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-white/65 text-base md:text-lg font-body font-light max-w-lg mx-auto mb-12 leading-relaxed"
        >
          Family owned since 2011. Over 25 years of experience. Honest
          prices, great hair — right in Glendale.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/services"
            className="border border-white/20 hover:border-gold/60 bg-white/5 hover:bg-white/10 text-white text-[11px] tracking-[0.2em] uppercase px-11 py-4 rounded-sm transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm"
          >
            View Our Services
          </Link>
          <a
            href={telHref(brand.phone)}
            className="border border-white/20 hover:border-gold/60 text-white/75 hover:text-gold text-[11px] tracking-[0.2em] uppercase px-11 py-4 rounded-sm transition-all duration-300 hover:-translate-y-0.5"
          >
            Call {brand.phone}
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-white/30 text-[9px] tracking-[0.3em] uppercase font-body">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-8 bg-gradient-to-b from-gold/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
