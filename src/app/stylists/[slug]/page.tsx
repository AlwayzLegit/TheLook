import { permanentRedirect } from "next/navigation";

// Legacy URL — stylist detail pages moved to /team/<slug>. Permanent
// redirect preserves inbound links + SEO while crawlers re-index.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function StylistSlugLegacyRedirect({ params }: any) {
  const { slug } = await params;
  permanentRedirect(`/team/${slug}`);
}
