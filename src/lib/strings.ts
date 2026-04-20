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
  salonEmail: "thelook_hairsalon@yahoo.com",

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
  //
  // Current rule set (latest owner guidance):
  //   1. $50 deposit charged at booking.
  //   2. Deposit is NON-REFUNDABLE. Applied to the service total at the
  //      appointment; forfeited if the client cancels or no-shows.
  //   3. In addition to losing the deposit, a 25% cancellation fee is
  //      charged on no-shows or same-day cancellations.
  depositHeadline: "Deposit & cancellation policy",
  cancellationFeeLine:
    "A 25% cancellation fee will be charged on no-shows or cancellations within 24 hours of the scheduled appointment.",
  depositPolicyLong:
    "You will be charged a $50 deposit upon booking your appointment. The deposit is non-refundable. " +
    "The amount of your deposit will be applied to the cost of your service at the time of your appointment. " +
    "If you need to cancel, you will lose your deposit, and a 25% cancellation fee will be charged " +
    "on no-shows or cancellations within 24 hours of the scheduled appointment.",
  depositPolicyBullets: [
    "$50 deposit is charged at booking. It's non-refundable.",
    "The deposit is applied to your service total at the appointment.",
    "Cancel or no-show? You lose the deposit.",
    "A 25% cancellation fee is also charged for no-shows or cancellations within 24 hours of the scheduled appointment.",
  ] as readonly string[],
  noShowBullet: "No-shows forfeit the deposit and are charged the 25% cancellation fee.",
  depositNote:
    "A $50 non-refundable deposit is charged at booking for appointments 100+ minutes long. The deposit credits to your final bill. A 25% cancellation fee is charged on no-shows or cancellations within 24 hours.",
  cancellationPolicyShort:
    "Your deposit is non-refundable. A 25% cancellation fee is charged on no-shows or cancellations within 24 hours of the scheduled appointment.",
} as const;

export type StringKey = keyof typeof strings;
