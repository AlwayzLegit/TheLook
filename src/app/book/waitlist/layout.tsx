import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// Waitlist is an internal form, not a content page. Keep the title
// + description for the browser tab but tell Google not to index —
// it competes with /book on intent without offering different value.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Join Waitlist",
    descriptionFor: (b) =>
      `Join the waitlist at ${b.name} for earlier appointment availability.`,
    canonical: "/book/waitlist",
    noindex: true,
  });
}

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
