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
  bookSuccess: "Your appointment is pending",
  bookSuccessMessage: "The salon will review your booking and send a final confirmation by email shortly.",
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
  // Current rule set (latest owner guidance — refundable with 24h+ notice):
  //   1. $50 deposit is taken at booking for bookings over $100.
  //   2. The deposit is applied to the service total at the appointment.
  //   3. Refundable if cancelled 24+ hours before the appointment.
  //   4. Forfeited on no-shows or cancellations within 24 hours.
  //   5. Additional cancellation / no-show fees may apply where applicable.
  depositHeadline: "Deposit & cancellation policy",
  cancellationFeeLine:
    "Cancellations within 24 hours of the scheduled appointment forfeit the deposit. Additional no-show or cancellation fees may apply.",
  depositPolicyLong:
    "Your deposit will be applied toward the total cost of your service at the time of your appointment. " +
    "To receive a refund of your deposit, cancellations must be made at least 24 hours in advance. " +
    "Cancellations made within 24 hours of the scheduled appointment will result in the loss of the deposit. " +
    "Please note that additional cancellation or no-show fees may apply where applicable.",
  depositPolicyBullets: [
    "$50 deposit is taken at booking for appointments over $100.",
    "Applied to your service total at the appointment.",
    "Refundable if you cancel 24+ hours in advance.",
    "Cancellations within 24 hours forfeit the deposit.",
    "Additional cancellation or no-show fees may apply where applicable.",
  ] as readonly string[],
  noShowBullet: "No-shows and same-day cancellations forfeit the deposit.",
  depositNote:
    "A $50 deposit is taken at booking for appointments over $100 — it credits toward your service total on the day. Refundable with 24+ hours notice; forfeited on same-day cancellations and no-shows.",
  cancellationPolicyShort:
    "Cancellations 24+ hours in advance are refundable. Within 24 hours, the deposit is forfeited. Additional fees may apply.",
  // Exact FAQ answer the owner approved. Used on the policy / FAQ sections
  // verbatim so the wording stays consistent with what's shown at booking.
  depositFaqAnswer:
    "Your deposit will be applied toward the total cost of your service at the time of your appointment. " +
    "To receive a refund of your deposit, cancellations must be made at least 24 hours in advance. " +
    "Cancellations made within 24 hours of the scheduled appointment will result in the loss of the deposit. " +
    "Please note that additional cancellation or no-show fees may apply where applicable.",
} as const;

export type StringKey = keyof typeof strings;
