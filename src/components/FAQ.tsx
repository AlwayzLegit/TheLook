"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";
import { useBranding } from "./BrandingProvider";
import { buildFaqs, type Faq } from "@/lib/faqs";

function FAQItem({
  faq,
  isOpen,
  onToggle,
  id,
}: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
}) {
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;
  return (
    <div className="border-b border-navy/15">
      <button
        id={buttonId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="font-heading text-lg pr-6 group-hover:text-rose transition-colors">
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
          className="w-6 h-6 flex items-center justify-center shrink-0 border border-navy/15 rounded-full group-hover:border-rose/30 transition-colors"
        >
          <svg className="w-3 h-3 text-rose" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-navy/75 font-body leading-relaxed pr-12">
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
  const brand = useBranding();
  const faqs = buildFaqs(brand.phone);

  return (
    <section className="py-24 md:py-32 bg-warm-white">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <AnimatedSection className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-8 h-[1px] bg-gold" />
            <span className="text-gold text-[11px] tracking-[0.25em] uppercase font-body">
              Common Questions
            </span>
            <span className="w-8 h-[1px] bg-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl">
            Frequently Asked
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div>
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                id={`faq-${index}`}
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
