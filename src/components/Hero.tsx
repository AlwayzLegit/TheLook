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

      {/* Gradient Overlay - more sophisticated */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/90" />

      {/* Subtle texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(30,31,43,0.4)_100%)]" />

      <motion.div style={{ opacity }} className="relative z-10 text-center px-8 max-w-5xl mx-auto">
        {/* Pre-heading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center justify-center gap-6 mb-8"
        >
          <span className="w-12 h-[1px] bg-gold/60" />
          <span className="text-gold/80 text-[11px] tracking-[0.4em] uppercase font-body">
            Est. 2011 &middot; Glendale, California
          </span>
          <span className="w-12 h-[1px] bg-gold/60" />
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

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-heading text-5xl md:text-7xl lg:text-8xl text-white tracking-[0.05em] mb-6"
        >
          HAIR SALON
        </motion.h1>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="w-20 h-[1px] bg-gold mx-auto mb-8"
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-white/50 text-base md:text-lg font-body font-light max-w-xl mx-auto mb-12 leading-relaxed tracking-wide"
        >
          Where artistry meets expertise. Over 25 years of beauty mastery
          dedicated to making you look and feel extraordinary.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-5 justify-center"
        >
          <Link
            href="/book"
            className="group bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.25em] uppercase px-12 py-4.5 transition-all duration-300 hover:shadow-[0_4px_30px_rgba(184,36,59,0.4)]"
          >
            Book Appointment
          </Link>
          <a
            href="tel:+18186625665"
            className="group border border-white/20 hover:border-gold/60 text-white/70 hover:text-gold text-[11px] tracking-[0.25em] uppercase px-12 py-4.5 transition-all duration-300"
          >
            Call (818) 662-5665
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-body">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-8 bg-gradient-to-b from-gold/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
