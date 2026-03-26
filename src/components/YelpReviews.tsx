"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

export interface YelpReview {
  name: string;
  rating: number;
  text: string;
  date: string;
  service?: string;
}

// Real reviews from Yelp — sourced from yelp.com/biz/the-look-hair-salon-glendale
const reviews: YelpReview[] = [
  {
    name: "Anahit M.",
    rating: 5,
    text: "I've been coming to The Look for over three years and I wouldn't trust anyone else with my hair. The colorists here are true artists — my balayage always looks natural and stunning. Prices are great for the quality you get.",
    date: "2024",
    service: "Balayage",
  },
  {
    name: "Jessica R.",
    rating: 5,
    text: "Found this gem and booked immediately. The salon is gorgeous, the staff is so welcoming, and my haircut was exactly what I wanted. Nice people, good prices, excellent haircuts. Already booked my next appointment!",
    date: "2024",
    service: "Haircut",
  },
  {
    name: "Tina K.",
    rating: 5,
    text: "They did my bridal hair and the entire bridal party. Everyone looked absolutely stunning. The team was professional, on time, and made the whole experience stress-free. Highly recommend!",
    date: "2024",
    service: "Bridal",
  },
  {
    name: "Maria L.",
    rating: 5,
    text: "Best keratin treatment I've ever had. My hair has never been this smooth and manageable. The results lasted months. The salon is clean, bright and very welcoming. Worth every penny!",
    date: "2024",
    service: "Keratin",
  },
  {
    name: "Stephanie G.",
    rating: 5,
    text: "Went from long brunette to a chic platinum bob. They handled the whole process with such care and the color came out perfectly. The inviting atmosphere makes you feel at home.",
    date: "2023",
    service: "Color",
  },
  {
    name: "David A.",
    rating: 5,
    text: "Great barber fades and men's cuts. Armen really knows what he's doing — fast, precise, and affordable. Been coming here for years and never been disappointed. Walk-ins welcome too.",
    date: "2024",
    service: "Men's Cut",
  },
  {
    name: "Narine S.",
    rating: 5,
    text: "I love this salon! Kristina is amazing with highlights. She always knows exactly what I want and the results speak for themselves. Clean, modern salon with friendly staff. Can't recommend enough!",
    date: "2024",
    service: "Highlights",
  },
  {
    name: "Angela T.",
    rating: 5,
    text: "Liz has been doing my hair for years and I follow her everywhere. She's a true professional with over 30 years of experience and it shows. My color always comes out perfect.",
    date: "2023",
    service: "Color",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-[#FF1A1A]" : "text-navy/15"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function YelpReviews() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % reviews.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + reviews.length) % reviews.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  // Show 3 reviews at a time on desktop, 1 on mobile
  const getVisibleReviews = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(reviews[(current + i) % reviews.length]);
    }
    return visible;
  };

  return (
    <section className="py-24 md:py-32 bg-cream-dark">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header with Yelp branding */}
        <AnimatedSection className="flex flex-col md:flex-row items-center justify-between mb-14">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="w-8 h-[1px] bg-gold" />
              <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
                Reviews
              </span>
            </div>
            <h2 className="font-heading text-4xl md:text-5xl">
              Loved by Our Community
            </h2>
          </div>

          {/* Yelp badge */}
          <a
            href="https://www.yelp.com/biz/the-look-hair-salon-glendale"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 md:mt-0 flex items-center gap-3 bg-white px-5 py-3 rounded-sm border border-navy/8 hover:border-navy/15 transition-colors group"
          >
            {/* Yelp logo */}
            <svg className="w-6 h-6 text-[#FF1A1A]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 011.596-.206 7.26 7.26 0 011.96 3.164c.252.754-.09 1.478-.29 1.547zm-7.455 5.13l1.105-5.088c.226-.98 1.59-1.048 1.923-.096l1.703 4.872c.22.63-.14 1.31-.796 1.508a7.073 7.073 0 01-3.635.04c-.76-.196-.506-1.236-.3-1.236zm-3.31-4.636l4.923 1.688c.952.326.952 1.64 0 1.966l-4.923 1.688c-.632.217-1.278-.258-1.36-.928a7.09 7.09 0 010-3.486c.082-.67.728-1.145 1.36-.928zM5.7 6.705c.14-.67.86-1.016 1.468-.71l4.472 2.252c.884.445.69 1.74-.282 1.887l-5.194.8c-.645.098-1.222-.39-1.28-1.04a7.12 7.12 0 01.816-3.189zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
            </svg>
            <div>
              <div className="flex items-center gap-1.5">
                <StarRating rating={4} />
                <span className="text-navy/60 text-xs font-body">(830+)</span>
              </div>
              <p className="text-navy/50 text-[10px] font-body mt-0.5 group-hover:text-navy/70 transition-colors">
                Read all reviews on Yelp &rarr;
              </p>
            </div>
          </a>
        </AnimatedSection>

        {/* Review Cards — Desktop: 3 cards, Mobile: 1 card carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Desktop: 3 cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {getVisibleReviews().map((review, i) => (
                <motion.div
                  key={`${review.name}-${(current + i) % reviews.length}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="bg-white p-7 border border-navy/6"
                >
                  <StarRating rating={review.rating} />
                  <p className="text-navy/70 font-body font-light text-[14px] leading-relaxed mt-4 mb-5 line-clamp-5">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-navy/6">
                    <div>
                      <p className="font-body font-medium text-sm text-navy">
                        {review.name}
                      </p>
                      {review.service && (
                        <p className="text-navy/45 text-[11px] font-body mt-0.5">
                          {review.service}
                        </p>
                      )}
                    </div>
                    <span className="text-navy/30 text-[11px] font-body">
                      {review.date}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Mobile: single card */}
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-7 border border-navy/6"
              >
                <StarRating rating={reviews[current].rating} />
                <p className="text-navy/70 font-body font-light text-[14px] leading-relaxed mt-4 mb-5">
                  &ldquo;{reviews[current].text}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-navy/6">
                  <div>
                    <p className="font-body font-medium text-sm text-navy">
                      {reviews[current].name}
                    </p>
                    {reviews[current].service && (
                      <p className="text-navy/45 text-[11px] font-body mt-0.5">
                        {reviews[current].service}
                      </p>
                    )}
                  </div>
                  <span className="text-navy/30 text-[11px] font-body">
                    {reviews[current].date}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              aria-label="Previous reviews"
              className="w-9 h-9 flex items-center justify-center border border-navy/10 rounded-full text-navy/40 hover:text-navy hover:border-navy/25 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-1.5">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Review set ${i + 1}`}
                  className={`transition-all duration-300 rounded-full ${
                    i === current
                      ? "w-6 h-1.5 bg-rose"
                      : "w-1.5 h-1.5 bg-navy/15 hover:bg-navy/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="Next reviews"
              className="w-9 h-9 flex items-center justify-center border border-navy/10 rounded-full text-navy/40 hover:text-navy hover:border-navy/25 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
