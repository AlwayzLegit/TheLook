import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// Token-driven cancellation confirmation reached only via the email
// link — never linked from anywhere crawlable. noindex prevents any
// rare side-channel discovery from polluting the index.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Cancel Appointment",
    description: "Confirm your appointment cancellation.",
    canonical: "/book/cancel",
    noindex: true,
  });
}

export default function CancelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
