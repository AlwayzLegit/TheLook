import { permanentRedirect } from "next/navigation";

// Legacy URL — the team / stylist list moved to /team. Permanent redirect
// so external links, Google, and cached bookmarks continue to resolve.
// Kept until the site has been off the old URL long enough for crawlers
// to have re-indexed; then we can delete this route.
export default function StylistsLegacyRedirect() {
  permanentRedirect("/team");
}
