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

  // Policies
  depositNote: "A $50 deposit may be required for select color/styling services. 25% cancellation fee applies for no-shows or cancellations within 24 hours.",
} as const;

export type StringKey = keyof typeof strings;
