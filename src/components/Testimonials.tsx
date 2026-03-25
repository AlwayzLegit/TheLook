"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const testimonials = [
  {
    name: "Anahit M.",
    text: "I've been coming to The Look for over three years and I wouldn't trust anyone else with my hair. The colorists here are true artists — my balayage always looks natural and stunning.",
    rating: 5,
    service: "Balayage & Color",
  },
  {
    name: "Jessica R.",
    text: "Found this gem on Instagram and booked immediately. The salon is gorgeous, the staff is so welcoming, and my haircut was exactly what I wanted. Already booked my next appointment!",
    rating: 5,
    service: "Haircut & Styling",
  },
  {
    name: "Tina K.",
    text: "They did my bridal hair and the entire bridal party. Everyone looked absolutely stunning. The team was professional, on time, and made the whole experience stress-free.",
    rating: 5,
    service: "Bridal Styling",
  },
  {
    name: "Maria L.",
    text: "Best keratin treatment I've ever had. My hair has never been this smooth and manageable. The results lasted months. Worth every penny!",
    rating: 5,
    service: "Keratin Treatment",
  },
  {
    name: "Stephanie G.",
    text: "I came in wanting a dramatic change — went from long brunette to a chic platinum bob. They handled the whole process with such care. Absolutely love my new look!",
    rating: 5,
    service: "Cut & Color Transformation",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-gold" : "text-navy/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="py-24 md:py-32 bg-navy text-white overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Client Love
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            What Our Clients Say
          </h2>
          <div className="w-16 h-[1px] bg-rose mx-auto" />
        </AnimatedSection>

        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              {/* Quote icon */}
              <svg
                className="w-10 h-10 text-rose/40 mx-auto mb-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <p className="text-white/80 text-lg md:text-xl font-body font-light leading-relaxed mb-6 italic">
                &ldquo;{testimonials[current].text}&rdquo;
              </p>

              <StarRating rating={testimonials[current].rating} />

              <p className="font-heading text-xl mt-4">
                {testimonials[current].name}
              </p>
              <p className="text-gold text-sm font-body mt-1">
                {testimonials[current].service}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-12 text-white/40 hover:text-gold transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-12 text-white/40 hover:text-gold transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? "bg-gold" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
