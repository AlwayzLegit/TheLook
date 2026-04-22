"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";
import { useBranding } from "./BrandingProvider";

function buildFaqs(phone: string) {
  return [
  {
    question: "Do I need an appointment, or do you accept walk-ins?",
    answer:
      `Walk-ins are always welcome! However, we recommend booking an appointment to ensure your preferred stylist and time slot. You can book online through our website or call us directly at ${phone}.`,
  },
  {
    question: "Will I be charged before the service?",
    answer:
      "A $50 deposit is taken at booking for appointments over $100 to secure your spot. The deposit is applied toward the total cost of your service at the time of your appointment.",
  },
  {
    question: "Will I get my deposit back?",
    answer:
      "Your deposit will be applied toward the total cost of your service at the time of your appointment. To receive a refund of your deposit, cancellations must be made at least 24 hours in advance. Cancellations made within 24 hours of the scheduled appointment will result in the loss of the deposit. Please note that additional cancellation or no-show fees may apply where applicable.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "We ask for at least 24 hours' notice to cancel or reschedule. Cancellations made within 24 hours of the appointment forfeit the deposit. Additional cancellation or no-show fees may apply where applicable.",
  },
  {
    question: "What happens if I'm a no-show or cancel?",
    answer:
      "No-shows and same-day cancellations forfeit the deposit. Additional cancellation or no-show fees may apply where applicable. Please provide as much notice as possible if you are unable to make it — 24+ hours lets us refund your deposit and offer the slot to another client.",
  },
  {
    question: "How should I prepare for a color appointment?",
    answer:
      "For best results, come with unwashed hair (1-2 days without washing is ideal). Avoid using heavy styling products. If it's your first color appointment with us, we'll do a quick consultation to discuss your goals.",
  },
  {
    question: "Do you offer free consultations?",
    answer:
      "Yes! We offer complimentary consultations for new clients or anyone considering a major change. Just stop by or give us a call — we're happy to help you figure out the best look.",
  },
  {
    question: "What products do you use?",
    answer:
      "We use only premium, professional-grade products from brands like Olaplex, Redken, Wella, and Kevin Murphy. All our color products are ammonia-free and gentle on your hair.",
  },
  {
    question: "Is parking available?",
    answer:
      "Yes! We have a free parking lot right at the salon for our customers, plus free street parking on South Central Avenue. We're easily accessible from the 134 and 2 freeways.",
  },
  {
    question: "Do you offer gift cards?",
    answer:
      "Absolutely! Gift cards are available in any denomination and can be purchased in-salon or by calling us. They make a perfect gift for any occasion.",
  },
  ];
}

type Faq = ReturnType<typeof buildFaqs>[number];

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-navy/8">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="font-heading text-lg pr-6 group-hover:text-rose transition-colors">
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
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
