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

  return (
    <section
      ref={ref}
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <motion.div className="absolute inset-0" style={{ y }}>
        <Image
          src="/images/hero/salon-main.jpg"
          alt="The Look Hair Salon"
          fill
          className="object-cover scale-110"
          priority
        />
      </motion.div>

      <div className="absolute inset-0 bg-navy/70" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <Image
            src="/images/logo.png"
            alt="The Look Hair Salon Logo"
            width={200}
            height={107}
            className="mx-auto mb-6 brightness-0 invert"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-heading text-5xl md:text-7xl text-white tracking-wider mb-6"
        >
          THE LOOK HAIR SALON
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-24 h-[1px] bg-gold mx-auto mb-6"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-white/70 text-lg md:text-xl font-body font-light max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Family owned &amp; operated since 2011. Over 25 years in the beauty
          industry &mdash; specializing in cutting, coloring, balayage,
          ombr&eacute;, highlights, extensions &amp; styling in Glendale, CA.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="https://thelookhairsalon.glossgenius.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body"
          >
            Book Online
          </a>
          <Link
            href="/services"
            className="border border-white/30 hover:border-gold hover:text-gold text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body"
          >
            Our Services
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-[1px] h-12 bg-gradient-to-b from-transparent to-gold/50"
        />
      </motion.div>
    </section>
  );
}
