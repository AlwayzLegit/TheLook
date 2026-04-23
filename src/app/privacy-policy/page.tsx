import { permanentRedirect } from "next/navigation";

// Defense-in-depth alias. Some earlier form copy + external links (A2P
// campaign submission included) pointed at /privacy-policy when the
// canonical route is /privacy. Permanent-redirect so TCR's crawler and
// any bookmarked links resolve instead of 404'ing.
export default function PrivacyPolicyLegacyRedirect() {
  permanentRedirect("/privacy");
}
