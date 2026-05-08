import type { Metadata } from "next";

// Override the root marketing title (rendered by app/layout.tsx) for
// /admin/login specifically. Without this, the public-facing
// "The Look Hair Salon | Beauty Hair Salon | Glendale, CA" title
// shows up in the admin's browser tab while they're logging in,
// which (a) is confusing to staff who have multiple Look tabs open,
// and (b) leaks the admin login URL into search-engine indexes if a
// crawler happens to follow a redirect there. robots:noindex avoids
// the second; the title swap fixes the first.
export const metadata: Metadata = {
  title: "Sign in — The Look Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
