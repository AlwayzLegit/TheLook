import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// Client-portal pages (magic-link login + signed-in account view) carry
// no marketing value and shouldn't surface in search results — they're
// reached via email-issued magic links. noindex prevents crawlers
// finding them through internal links from logging out / footer.
// Mirrors the pattern already in place for /book/cancel + /book/reschedule.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Client Portal",
    description: "Sign in to view and manage your appointments.",
    canonical: "/my",
    noindex: true,
  });
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
