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

// Real verified reviews sourced from Google Reviews, Yellow Pages, and Yelp snippets
const reviews: YelpReview[] = [
  {
    name: "Annie M.",
    rating: 5,
    text: "The Look helps me look fabulous fast without emptying out my wallet. I have gone to The Look since it opened, have had various stylists cut my hair, and have always left pleased as punch. The stylists listen to me, ask questions, make suggestions, and then always deliver just what I want. Who says looking good has to cost a lot?",
    date: "Yelp",
    service: "Haircut",
  },
  {
    name: "Kelsey F.",
    rating: 5,
    text: "It was my first time coming here and everyone was beyond amazing! Huge thanks to Liz for doing my hair, I absolutely love it!",
    date: "Google",
    service: "Styling",
  },
  {
    name: "Elena K.",
    rating: 5,
    text: "WOW! Honestly I've found my dream salon for everything at last! The prices are unreal. I can finally not feel guilty.",
    date: "Google",
  },
  {
    name: "Alexa S.",
    rating: 5,
    text: "Been coming here for years but first time reviewing. Had moved away but still do the drive as it's hard to find a salon like this where they do a good job at an affordable price, with genuinely nice stylists and owners. Always a great experience!",
    date: "Google",
  },
  {
    name: "Lupe G.",
    rating: 5,
    text: "Always a 10/10 experience! Took my daughter in to get her hair bleached and styled and couldn't be happier. They were very sweet and attentive, the results were amazing, and her hair is very soft and doesn't seem damaged.",
    date: "Google",
    service: "Bleach & Style",
  },
  {
    name: "Meg A.",
    rating: 5,
    text: "I drive from the Inland Empire to see my girl Jasmen. I love love love her. Truly a homecoming each time.",
    date: "Google",
    service: "Styling",
  },
  {
    name: "Salma A.",
    rating: 5,
    text: "Jasmin is my stylist and she is amazing. Everyone is friendly and I always get smiles from the moment I walk in.",
    date: "Google",
    service: "Styling",
  },
  {
    name: "Shruthi R.",
    rating: 5,
    text: "I have been regular here now. Me and my husband get our hair cuts done here. Highly recommend this place! Keep up the great work!",
    date: "Google",
    service: "Haircut",
  },
  {
    name: "Ryan S.",
    rating: 4,
    text: "A great place for a quick cut at a great price where you can usually get the look you want. Friendly staff and no long waits.",
    date: "Yelp",
    service: "Haircut",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? "text-gold" : "text-navy/12"}`}
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
    <section className="py-24 md:py-32 bg-cream-dark relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(196,162,101,0.06)_0%,transparent_70%)]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[radial-gradient(circle,rgba(196,162,101,0.04)_0%,transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
        {/* Header with Yelp branding */}
        <AnimatedSection className="flex flex-col md:flex-row items-center justify-between mb-14">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="w-10 h-[1px] bg-gradient-to-r from-gold to-gold/30" />
              <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
                Reviews
              </span>
            </div>
            <h2 className="font-heading text-4xl md:text-5xl">
              Loved by Our Community
            </h2>
          </div>

          {/* Review badges */}
          <div className="mt-6 md:mt-0 flex flex-col sm:flex-row gap-3">
            {/* Yelp badge */}
            <a
              href="https://www.yelp.com/biz/the-look-hair-salon-glendale"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white px-5 py-3.5 border border-navy/6 hover:border-gold/30 transition-all duration-500 group hover:shadow-[0_8px_30px_rgba(196,162,101,0.1)] hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 text-[#FF1A1A] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 011.596-.206 7.26 7.26 0 011.96 3.164c.252.754-.09 1.478-.29 1.547zm-7.455 5.13l1.105-5.088c.226-.98 1.59-1.048 1.923-.096l1.703 4.872c.22.63-.14 1.31-.796 1.508a7.073 7.073 0 01-3.635.04c-.76-.196-.506-1.236-.3-1.236zm-3.31-4.636l4.923 1.688c.952.326.952 1.64 0 1.966l-4.923 1.688c-.632.217-1.278-.258-1.36-.928a7.09 7.09 0 010-3.486c.082-.67.728-1.145 1.36-.928zM5.7 6.705c.14-.67.86-1.016 1.468-.71l4.472 2.252c.884.445.69 1.74-.282 1.887l-5.194.8c-.645.098-1.222-.39-1.28-1.04a7.12 7.12 0 01.816-3.189zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-body font-bold text-sm text-navy">4.2</span>
                  <StarRating rating={4} />
                  <span className="text-navy/55 text-xs font-body">830+</span>
                </div>
                <p className="text-navy/45 text-[10px] font-body mt-0.5 group-hover:text-navy/65 transition-colors">
                  Yelp reviews &rarr;
                </p>
              </div>
            </a>

            {/* Google badge */}
            <a
              href="https://www.google.com/maps/place/The+Look+Hair+Salon/@34.1425,-118.2553,17z/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white px-5 py-3.5 border border-navy/6 hover:border-gold/30 transition-all duration-500 group hover:shadow-[0_8px_30px_rgba(196,162,101,0.1)] hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-body font-bold text-sm text-navy">4.1</span>
                  <StarRating rating={4} />
                  <span className="text-navy/55 text-xs font-body">146+</span>
                </div>
                <p className="text-navy/45 text-[10px] font-body mt-0.5 group-hover:text-navy/65 transition-colors">
                  Google reviews &rarr;
                </p>
              </div>
            </a>
          </div>
        </AnimatedSection>

        {/* Review Cards */}
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
                  className="relative bg-white p-8 border border-navy/6 hover:border-gold/30 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(196,162,101,0.1)] hover:-translate-y-1 group"
                >
                  {/* Decorative quote mark */}
                  <div className="absolute top-5 right-6 font-heading text-5xl text-gold/8 leading-none group-hover:text-gold/18 transition-colors duration-500">&ldquo;</div>

                  {/* Bottom accent line on hover — matches ServicesPreview */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose via-gold to-rose scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                  <StarRating rating={review.rating} />
                  <p className="text-navy/65 font-body font-light text-[14px] leading-relaxed mt-5 mb-6 line-clamp-5 relative">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-5 border-t border-navy/6">
                    <div className="flex items-center gap-3">
                      {/* Avatar initial */}
                      <div className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center border border-gold/15">
                        <span className="text-navy/60 font-heading text-sm">{review.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-body font-medium text-sm text-navy group-hover:text-rose transition-colors duration-300">
                          {review.name}
                        </p>
                        {review.service && (
                          <p className="text-navy/40 text-[10px] tracking-wider uppercase font-body mt-0.5">
                            {review.service}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-body tracking-wider uppercase px-2.5 py-1 rounded-sm ${
                      review.date === "Yelp"
                        ? "bg-cream-dark text-rose/70"
                        : "bg-cream-dark text-navy/50"
                    }`}>
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
                className="relative bg-white p-8 border border-navy/6"
              >
                <div className="absolute top-5 right-6 font-heading text-5xl text-gold/8 leading-none">&ldquo;</div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose via-gold to-rose" />
                <StarRating rating={reviews[current].rating} />
                <p className="text-navy/65 font-body font-light text-[14px] leading-relaxed mt-5 mb-6">
                  &ldquo;{reviews[current].text}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-5 border-t border-navy/6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center border border-gold/15">
                      <span className="text-navy/60 font-heading text-sm">{reviews[current].name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-body font-medium text-sm text-navy">
                        {reviews[current].name}
                      </p>
                      {reviews[current].service && (
                        <p className="text-navy/40 text-[10px] tracking-wider uppercase font-body mt-0.5">
                          {reviews[current].service}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-body tracking-wider uppercase px-2.5 py-1 rounded-sm ${
                    reviews[current].date === "Yelp"
                      ? "bg-cream-dark text-rose/70"
                      : "bg-cream-dark text-navy/50"
                  }`}>
                    {reviews[current].date}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={prev}
              aria-label="Previous reviews"
              className="w-10 h-10 flex items-center justify-center border border-navy/8 text-navy/35 hover:text-gold hover:border-gold/30 transition-all duration-500 hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Review set ${i + 1}`}
                  className={`transition-all duration-500 ${
                    i === current
                      ? "w-7 h-[3px] bg-gradient-to-r from-rose to-gold rounded-full"
                      : "w-[3px] h-[3px] bg-navy/12 hover:bg-gold/40 rounded-full"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="Next reviews"
              className="w-10 h-10 flex items-center justify-center border border-navy/8 text-navy/35 hover:text-gold hover:border-gold/30 transition-all duration-500 hover:-translate-y-0.5"
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
