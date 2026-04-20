/**
 * User-facing strings extracted for future i18n support.
 * Import from here instead of hardcoding text in components.
 *
 * To add a new language: create a parallel object (e.g. stringsAM for Armenian)
 * and switch based on a locale context/cookie.
 */

export const strings = {
  // Salon identity
  salonName: "The Look Hair Salon",
  salonTagline: "Family owned with over 25 years of experience. The highest quality hair services in Glendale at unbeatable prices.",
  salonAddress: "919 South Central Ave Suite #E, Glendale, CA 91204",
  salonPhone: "(818) 662-5665",
  salonEmail: "look_hairsalon@yahoo.com",

  // Navigation
  navHome: "Home",
  navServices: "Services",
  navGallery: "Gallery",
  navAbout: "About",
  navContact: "Contact",
  navBookNow: "Book Now",

  // Booking flow
  bookSelectService: "Pick a Service",
  bookSelectStylist: "Choose Your Stylist",
  bookSelectDateTime: "Pick a Date & Time",
  bookYourInfo: "Your Information",
  bookReview: "Review & Confirm",
  bookConfirmButton: "Confirm Booking",
  bookSuccess: "You're All Set!",
  bookSuccessMessage: "A confirmation email has been sent with your appointment details.",
  bookCancelNote: "Need to cancel? Check your confirmation email for a cancellation link.",
  bookReturnHome: "Return to Home",

  // Contact
  contactTitle: "Contact Us",
  contactSubtitle: "The absolute best way to reach us is by calling the salon directly. We will be glad to assist you with any questions you may have.",
  contactSendMessage: "Send Message",
  contactSuccess: "Thank you! We'll get back to you shortly.",
  contactError: "Something went wrong. Please try again or call us directly.",

  // Error pages
  notFoundTitle: "404",
  notFoundMessage: "The page you're looking for doesn't exist or has been moved.",
  errorTitle: "Oops",
  errorMessage: "We encountered an unexpected error. Please try again or return to the home page.",
  bookingErrorTitle: "Unable to Book",
  bookingErrorMessage: "We're having trouble with our booking system right now.",
  bookingErrorFallback: "Please call us directly at (818) 662-5665 to schedule your appointment.",

  // Common actions
  tryAgain: "Try Again",
  goHome: "Go Home",
  returnHome: "Return Home",
  viewOurServices: "View Our Services",
  callUs: "Call (818) 662-5665",

  // Policies — single source of truth. Import these everywhere the deposit /
  // cancellation rules are displayed (booking, emails, FAQ, terms, service
  // pages). Change here and every surface updates.
  depositHeadline: "About your deposit",
  depositPolicyLong:
    "Your deposit is applied toward the total cost of your service at the time of your appointment. " +
    "To receive a refund, cancellations must be made at least 24 hours in advance. " +
    "Cancellations made within 24 hours of your scheduled appointment will result in the loss of the deposit. " +
    "Additional cancellation or no-show fees may apply where applicable.",
  depositPolicyBullets: [
    "Your deposit counts toward your service total — it's not an extra fee.",
    "Cancel 24+ hours ahead: deposit is fully refunded.",
    "Cancel within 24 hours: deposit is forfeited.",
    "Additional cancellation or no-show fees may apply.",
  ] as readonly string[],
  noShowBullet: "No-shows are charged the full service price.",
  depositNote:
    "A $50 deposit is required for appointments 100+ minutes long. The deposit credits to your final bill, is refundable up to 24 hours before your appointment, and is forfeited for cancellations within 24 hours or no-shows.",
  cancellationPolicyShort:
    "Cancellations need 24+ hours' notice for a full deposit refund. Same-day cancellations or no-shows forfeit the deposit and may incur additional fees.",
} as const;

export type StringKey = keyof typeof strings;
