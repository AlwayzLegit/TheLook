import { permanentRedirect } from "next/navigation";

// Defense-in-depth alias. /terms-and-conditions was referenced by the
// booking + contact forms (bug fixed in this same change) and may have
// been submitted to Twilio's A2P campaign review. Permanent-redirect so
// the crawler and any cached external link resolve to the canonical
// /terms page instead of 404'ing.
export default function TermsAndConditionsLegacyRedirect() {
  permanentRedirect("/terms");
}
