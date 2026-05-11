import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// Client-portal pages (magic-link login + signed-in account view).
// Round-30 SEO: these were previously noindex'd to keep them out of
// search results, but Semrush counted that as a "Blocked from AI
// Search" failure (the page is linked from the navbar + footer so
// it's discoverable, then flagged as blocked when the meta tag is
// found). The pages themselves are harmless to index — /my/login is
// a normal sign-in form, /my redirects unauthenticated visitors to
// /my/login. Letting them index hits AI Search Health 100% without
// any real downside.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Client Portal",
    description: "Sign in to view and manage your appointments.",
    canonical: "/my",
  });
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
