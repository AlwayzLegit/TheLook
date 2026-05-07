// FAQ copy is owner-approved and rendered visibly on /services. Lifted
// out of the FAQ component so server pages (e.g. the /services route)
// can also serialize it into FAQPage JSON-LD without pulling in a
// "use client" module.

export interface Faq {
  question: string;
  answer: string;
}

export function buildFaqs(phone: string): Faq[] {
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
        "We ask for 24 hours notice so we can offer your slot to someone else. Inside 24 hours, there's a 25% cancellation fee, and the deposit is forfeited on any deposit-required booking. Life happens — just give us as much heads-up as you can.",
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
        "We use only premium, professional-grade products from brands like Redken, Igora Luxury Hair Color, B3 Brazilian Bond Builder and other quality products. All our permanent hair color products are gentle and nourishing, it fully covers grey hair, adding shine & hydration.",
    },
    {
      question: "Is parking available?",
      answer:
        "Yes! We have a free parking lot right at the salon for our customers, plus free street parking on South Central Avenue. We're easily accessible from the 134 and 2 freeways.",
    },
    {
      question: "Do you offer gift cards?",
      answer:
        "Absolutely! Gift cards are available in any denomination and can be purchased in-salon. They make a perfect gift for any occasion.",
    },
  ];
}
