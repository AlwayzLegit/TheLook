"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const faqs = [
  {
    question: "Do I need an appointment, or do you accept walk-ins?",
    answer:
      "While we do accept walk-ins based on availability, we highly recommend booking an appointment to ensure your preferred stylist and time slot. You can book through our website or by calling us directly.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "We require at least 24 hours notice for cancellations or rescheduling. No-shows or cancellations within 24 hours are subject to a 25% cancellation fee. A $50 deposit is required for select color and styling services.",
  },
  {
    question: "How should I prepare for a color appointment?",
    answer:
      "For best results, come with unwashed hair (1-2 days without washing is ideal). Avoid using heavy styling products. If it's your first color appointment with us, we'll schedule a consultation to discuss your goals and do a strand test if needed.",
  },
  {
    question: "Do you offer consultations?",
    answer:
      "Yes! We offer complimentary 15-minute consultations for new clients or anyone considering a major change. This allows us to understand your vision, assess your hair, and recommend the best approach.",
  },
  {
    question: "What products do you use?",
    answer:
      "We use only premium, professional-grade products from brands like Olaplex, Redken, Wella, and Kevin Murphy. All our color products are ammonia-free and gentle on your hair.",
  },
  {
    question: "Is parking available?",
    answer:
      "Yes! We offer a free parking lot right at the salon for our customers, plus free street parking is available on South Central Avenue. We're easily accessible from the 134 and 2 freeways.",
  },
  {
    question: "Do you offer gift cards?",
    answer:
      "Absolutely! Gift cards are available in any denomination and can be purchased in-salon or by calling us. They make a perfect gift for any occasion.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-navy/10">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="font-heading text-lg pr-4">{faq.question}</span>
        <motion.svg
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-rose shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-navy/60 font-body font-light leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Common Questions
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">FAQ</h2>
          <div className="w-16 h-[1px] bg-rose mx-auto" />
        </AnimatedSection>

        <AnimatedSection>
          <div>
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              />
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
