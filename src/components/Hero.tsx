"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Parallax Background Image */}
      <motion.div className="absolute inset-0" style={{ y }}>
        <Image
          src="/images/hero/salon-main.jpg"
          alt="The Look Hair Salon"
          fill
          className="object-cover scale-110"
          priority
        />
      </motion.div>

      {/* Gradient overlay — dark with subtle warmth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(19, 19, 23, 0.85) 0%,
            rgba(19, 19, 23, 0.65) 40%,
            rgba(19, 19, 23, 0.75) 70%,
            rgba(19, 19, 23, 0.95) 100%
          )`
        }}
      />

      {/* Content */}
      <motion.div 
        style={{ opacity }} 
        className="relative z-10 text-center px-6 max-w-4xl mx-auto"
      >
        {/* Label badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center justify-center gap-6 mb-10"
        >
          <span 
            className="w-12 h-[1px]" 
            style={{ background: "rgba(196, 162, 101, 0.4)" }} 
          />
          <span 
            className="text-[11px] tracking-[0.35em] uppercase"
            style={{ 
              fontFamily: "var(--font-label)", 
              color: "var(--color-primary-dim)" 
            }}
          >
            Est. 2011 · Glendale, CA
          </span>
          <span 
            className="w-12 h-[1px]" 
            style={{ background: "rgba(196, 162, 101, 0.4)" }} 
          />
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-4"
        >
          <Image
            src="/images/logo.png"
            alt="The Look"
            width={180}
            height={96}
            className="mx-auto brightness-0 invert"
          />
        </motion.div>

        {/* Main Headline — Editorial authority */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-5xl md:text-7xl lg:text-8xl tracking-wide mb-6"
          style={{ 
            fontFamily: "var(--font-heading)",
            color: "var(--color-on-surface)",
            letterSpacing: "-0.02em"
          }}
        >
          HAIR SALON
        </motion.h1>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="w-20 h-[2px] mx-auto mb-8"
          style={{ background: "var(--color-primary-dim)" }}
        />

        {/* Tagline — body text, breathable */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-base md:text-lg max-w-lg mx-auto mb-12 leading-relaxed"
          style={{ 
            fontFamily: "var(--font-body)",
            color: "var(--color-on-surface-variant)",
            fontWeight: 300
          }}
        >
          Family owned with over 25 years of experience. The highest quality
          hair services in Glendale at unbeatable prices.
        </motion.p>

        {/* CTAs — gradient gold primary, ghost secondary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/book"
            className="btn-rose inline-flex items-center justify-center text-[11px] tracking-[0.2em] uppercase px-10 py-4 rounded-sm font-medium"
          >
            Book Your Appointment
          </Link>
          <a
            href="tel:+18186625665"
            className="btn-ghost inline-flex items-center justify-center text-[11px] tracking-[0.2em] uppercase px-10 py-4 rounded-sm"
          >
            Call (818) 662-5665
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-10"
          style={{ 
            background: "linear-gradient(to bottom, var(--color-primary-dim), transparent)" 
          }}
        />
      </motion.div>
    </section>
  );
}
