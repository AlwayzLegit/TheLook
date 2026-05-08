import { getPosts } from "@/lib/blog/posts";
import { stripMarkdown } from "@/lib/blog/markdown";

// RSS 2.0 feed for the blog. Read by feed aggregators, Google News
// discovery, and any "subscribe via RSS" workflow. Cached with
// revalidate so the cost is one DB roundtrip per minute.

const SITE_URL = (process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com").replace(/\/$/, "");
const SITE_TITLE = "The Look Hair Salon — Journal";
const SITE_DESC =
  "Hair care tips, color trends, styling guides, and salon news from The Look Hair Salon in Glendale, CA.";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { posts } = await getPosts({ limit: 50, offset: 0 });
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const desc = (p.excerpt && p.excerpt.trim()) || stripMarkdown(p.content_md, 280);
      const pubDate = (p.published_at ? new Date(p.published_at) : new Date()).toUTCString();
      const categoryEl = p.category
        ? `<category>${escapeXml(p.category.name)}</category>`
        : "";
      return [
        "<item>",
        `<title>${escapeXml(p.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<description>${escapeXml(desc)}</description>`,
        `<pubDate>${pubDate}</pubDate>`,
        `<dc:creator>${escapeXml(p.author_name)}</dc:creator>`,
        categoryEl,
        "</item>",
      ].filter(Boolean).join("");
    })
    .join("");

  const lastBuildDate = posts[0]?.updated_at
    ? new Date(posts[0].updated_at).toUTCString()
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL + "/blog")}</link>
    <atom:link href="${escapeXml(SITE_URL + "/blog/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

// ISR: regenerate every minute. Admin save handlers also fire
// revalidatePath("/blog/rss.xml") so a publish lands in the feed
// within seconds, not just on the next 60s tick.
export const revalidate = 60;
