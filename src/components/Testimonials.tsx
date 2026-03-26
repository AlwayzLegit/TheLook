"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const testimonials = [
  {
    name: "Anahit M.",
    text: "I've been coming to The Look for over three years and I wouldn't trust anyone else with my hair. The colorists here are true artists — my balayage always looks natural and stunning.",
    service: "Balayage & Color",
  },
  {
    name: "Jessica R.",
    text: "Found this gem and booked immediately. The salon is gorgeous, the staff is so welcoming, and my haircut was exactly what I wanted. Already booked my next appointment!",
    service: "Haircut & Styling",
  },
  {
    name: "Tina K.",
    text: "They did my bridal hair and the entire bridal party. Everyone looked absolutely stunning. The team was professional, on time, and made the whole experience stress-free.",
    service: "Bridal Styling",
  },
  {
    name: "Maria L.",
    text: "Best keratin treatment I've ever had. My hair has never been this smooth and manageable. The results lasted months. Totally worth it!",
    service: "Keratin Treatment",
  },
  {
    name: "Stephanie G.",
    text: "Went from long brunette to a chic platinum bob. They handled the whole process with such care. Nice people, good prices, excellent work!",
    service: "Cut & Color",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="py-24 md:py-32 bg-navy relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 relative">
        <AnimatedSection className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-8 h-[1px] bg-gold/40" />
            <span className="text-gold/70 text-[11px] tracking-[0.25em] uppercase font-body">
              Testimonials
            </span>
            <span className="w-8 h-[1px] bg-gold/40" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl text-white">
            What Our Clients Say
          </h2>
        </AnimatedSection>

        <div className="relative min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <span className="block font-heading text-6xl text-gold/20 leading-none mb-4">
                &ldquo;
              </span>

              <p className="text-white/75 text-lg font-body font-light leading-relaxed mb-8 italic">
                {testimonials[current].text}
              </p>

              <div className="w-8 h-[1px] bg-gold/30 mx-auto mb-5" />

              <p className="font-heading text-lg text-white">
                {testimonials[current].name}
              </p>
              <p className="text-gold/60 text-[11px] tracking-[0.15em] uppercase font-body mt-1">
                {testimonials[current].service}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2.5 mt-10">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Testimonial ${i + 1}`}
              className={`transition-all duration-300 rounded-full ${
                i === current
                  ? "w-7 h-1.5 bg-gold"
                  : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
