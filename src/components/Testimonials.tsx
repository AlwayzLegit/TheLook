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
    text: "Found this gem on Instagram and booked immediately. The salon is gorgeous, the staff is so welcoming, and my haircut was exactly what I wanted. Already booked my next appointment!",
    service: "Haircut & Styling",
  },
  {
    name: "Tina K.",
    text: "They did my bridal hair and the entire bridal party. Everyone looked absolutely stunning. The team was professional, on time, and made the whole experience stress-free.",
    service: "Bridal Styling",
  },
  {
    name: "Maria L.",
    text: "Best keratin treatment I've ever had. My hair has never been this smooth and manageable. The results lasted months. Worth every penny!",
    service: "Keratin Treatment",
  },
  {
    name: "Stephanie G.",
    text: "I came in wanting a dramatic change — went from long brunette to a chic platinum bob. They handled the whole process with such care. Absolutely love my new look!",
    service: "Cut & Color Transformation",
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
    <section className="py-28 md:py-36 bg-navy relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gold blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-rose blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-8 lg:px-12 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-8 h-[1px] bg-gold/40" />
            <span className="text-gold/60 text-[11px] tracking-[0.3em] uppercase font-body">
              Testimonials
            </span>
            <span className="w-8 h-[1px] bg-gold/40" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl text-white">
            What Our Clients Say
          </h2>
        </AnimatedSection>

        <div className="relative min-h-[250px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Large quote mark */}
              <span className="block font-heading text-7xl text-gold/20 leading-none mb-4">
                &ldquo;
              </span>

              <p className="text-white/70 text-lg md:text-xl font-body font-light leading-relaxed mb-8 italic max-w-3xl mx-auto">
                {testimonials[current].text}
              </p>

              <div className="w-8 h-[1px] bg-gold/40 mx-auto mb-6" />

              <p className="font-heading text-lg text-white">
                {testimonials[current].name}
              </p>
              <p className="text-gold/60 text-[11px] tracking-[0.2em] uppercase font-body mt-1">
                {testimonials[current].service}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mt-12">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`transition-all duration-300 ${
                i === current
                  ? "w-8 h-[2px] bg-gold"
                  : "w-4 h-[2px] bg-white/15 hover:bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
