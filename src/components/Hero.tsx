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
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

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
          alt="The Look Hair Salon"
          fill
          className="object-cover scale-105"
          priority
        />
      </motion.div>

      {/* Warm gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/75 via-navy/55 to-navy/80" />

      <motion.div style={{ opacity }} className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center justify-center gap-5 mb-8"
        >
          <span className="w-10 h-[1px] bg-gold/50" />
          <span className="text-gold text-[11px] tracking-[0.35em] uppercase font-body">
            Est. 2011 &middot; Glendale, CA
          </span>
          <span className="w-10 h-[1px] bg-gold/50" />
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-3"
        >
          <Image
            src="/images/logo.png"
            alt="The Look"
            width={160}
            height={85}
            className="mx-auto brightness-0 invert"
          />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-heading text-5xl md:text-7xl text-white tracking-wide mb-5"
        >
          HAIR SALON
        </motion.h1>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="w-16 h-[1px] bg-gold mx-auto mb-7"
        />

        {/* Tagline — warm and welcoming, not pretentious */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-white/70 text-base md:text-lg font-body font-light max-w-lg mx-auto mb-11 leading-relaxed"
        >
          Family owned with over 25 years of experience. The highest quality
          hair services in Glendale at unbeatable prices.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/book"
            className="bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 rounded-sm transition-all duration-300 hover:shadow-[0_4px_24px_rgba(194,39,75,0.35)]"
          >
            Book Your Appointment
          </Link>
          <a
            href="tel:+18186625665"
            className="border border-white/25 hover:border-gold text-white/80 hover:text-gold text-[11px] tracking-[0.2em] uppercase px-10 py-4 rounded-sm transition-all duration-300"
          >
            Call (818) 662-5665
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-8 bg-gradient-to-b from-gold/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
