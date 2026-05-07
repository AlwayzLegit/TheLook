import { permanentRedirect } from "next/navigation";

// Legacy URL — stylist detail pages moved to /team/<slug>. Permanent
// redirect preserves inbound links + SEO while crawlers re-index.
export default async function StylistSlugLegacyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/team/${slug}`);
}
