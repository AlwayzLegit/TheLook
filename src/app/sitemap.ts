import type { MetadataRoute } from "next";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { SERVICE_CATEGORIES } from "@/lib/service-categories";

// Sitemap is regenerated on Vercel's default ISR interval for dynamic
// metadata routes. We pull the stylist + service detail URLs from the
// DB so Google actually discovers them instead of only the index pages.
// Image entries (Next.js emits <image:image> children when the `images`
// array is set) feed Google Image Search — the cheapest extra channel
// for a salon, since "balayage" / "ombre" / "haircut" queries surface
// visual results above the blue links.
export const revalidate = 3600;

const baseUrl = "https://www.thelookhairsalonla.com";

// Stored image URLs are mostly absolute (Supabase storage, external
// CDN), but SERVICE_CATEGORIES.heroImage and any /images/* fallback are
// site-relative — the sitemap-image protocol requires absolute <loc>
// values, so we resolve them here. Null/empty in → null out so callers
// can guard with a simple truthy check.
//
// Site-relative paths from legacy DB rows can also contain literal
// spaces and "&" characters (e.g. "/images/services/Color & Highlights/
// bleaching-roots.jpg"). Those are valid in the filesystem but invalid
// in XML — an unescaped "&" in <image:loc> triggers an
// xmlParseEntityRef parse error and breaks the whole sitemap. Next.js's
// MetadataRoute.Sitemap generator doesn't escape these for us inside
// the images array. encodeURI() handles spaces (and other unsafe path
// chars), but it intentionally leaves reserved URI characters like "&"
// alone, so we follow it with an explicit "&" -> "%26" pass.
// Absolute http(s) URLs are assumed pre-encoded by their source
// (Supabase Storage doesn't emit raw &/spaces in object keys).
function toAbsImage(src: string | null | undefined): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  const encoded = encodeURI(path).replace(/&/g, "%26");
  return `${baseUrl}${encoded}`;
}

async function dynamicEntries(): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabaseConfig) return [];
  const out: MetadataRoute.Sitemap = [];

  try {
    const { data: stylists } = await supabase
      .from("stylists")
      .select("slug, updated_at, image_url")
      .eq("active", true);
    for (const row of (stylists || []) as Array<{
      slug: string | null;
      updated_at: string | null;
      image_url: string | null;
    }>) {
      if (!row.slug) continue;
      const img = toAbsImage(row.image_url);
      out.push({
        url: `${baseUrl}/team/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
        ...(img ? { images: [img] } : {}),
      });
    }
  } catch {
    // Pre-migration envs may not have the column — skip silently.
  }

  try {
    const { data: staff } = await supabase
      .from("admin_users")
      .select("slug, updated_at, image_url")
      .eq("active_for_public", true);
    for (const row of (staff || []) as Array<{
      slug: string | null;
      updated_at: string | null;
      image_url: string | null;
    }>) {
      if (!row.slug) continue;
      const img = toAbsImage(row.image_url);
      out.push({
        url: `${baseUrl}/team/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
        ...(img ? { images: [img] } : {}),
      });
    }
  } catch {
    // Pre-migration envs
  }

  try {
    const { data: services } = await supabase
      .from("services")
      .select("slug, updated_at, image_url")
      .eq("active", true);
    for (const row of (services || []) as Array<{
      slug: string | null;
      updated_at: string | null;
      image_url: string | null;
    }>) {
      if (!row.slug) continue;
      const img = toAbsImage(row.image_url);
      out.push({
        url: `${baseUrl}/services/item/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
        ...(img ? { images: [img] } : {}),
      });
    }
  } catch {}

  // Blog posts (published or scheduled-and-due) — excerpted from the
  // RLS query so the public sitemap matches what visitors can crawl.
  try {
    const nowIso = new Date().toISOString();
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at, cover_image_url")
      .or(`status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${nowIso})`);
    for (const row of (posts || []) as Array<{
      slug: string | null;
      updated_at: string | null;
      published_at: string | null;
      cover_image_url: string | null;
    }>) {
      if (!row.slug) continue;
      const img = toAbsImage(row.cover_image_url);
      out.push({
        url: `${baseUrl}/blog/${row.slug}`,
        lastModified: row.updated_at
          ? new Date(row.updated_at)
          : row.published_at
            ? new Date(row.published_at)
            : new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
        ...(img ? { images: [img] } : {}),
      });
    }
  } catch {}

  // Blog category landing pages — only active categories with at
  // least one visible post are worth listing.
  try {
    const { data: categories } = await supabase
      .from("blog_categories")
      .select("slug, updated_at, cover_image_url")
      .eq("active", true);
    for (const row of (categories || []) as Array<{
      slug: string | null;
      updated_at: string | null;
      cover_image_url: string | null;
    }>) {
      if (!row.slug) continue;
      const img = toAbsImage(row.cover_image_url);
      out.push({
        url: `${baseUrl}/blog/category/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
        ...(img ? { images: [img] } : {}),
      });
    }
  } catch {}

  return out;
}

// Every public gallery photo gets attached to /gallery so Google Image
// Search has one concrete URL to crawl them from. gallery_items hold
// the single-shot grid; gallery_before_after rows contribute two
// images each (before + after). 1000 images per <url> is the protocol
// ceiling — well above any salon's gallery — so a single page entry
// is the right shape.
async function galleryImages(): Promise<string[]> {
  if (!hasSupabaseConfig) return [];
  const urls: string[] = [];
  try {
    const { data } = await supabase
      .from("gallery_items")
      .select("image_url")
      .eq("active", true);
    for (const row of (data || []) as Array<{ image_url: string | null }>) {
      const u = toAbsImage(row.image_url);
      if (u) urls.push(u);
    }
  } catch {}
  try {
    const { data } = await supabase
      .from("gallery_before_after")
      .select("before_url, after_url")
      .eq("active", true);
    for (const row of (data || []) as Array<{
      before_url: string | null;
      after_url: string | null;
    }>) {
      const b = toAbsImage(row.before_url);
      const a = toAbsImage(row.after_url);
      if (b) urls.push(b);
      if (a) urls.push(a);
    }
  } catch {}
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const galleryImgs = await galleryImages();

  const statics: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/services`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    // Service category landing pages — previously missing from the
    // sitemap entirely. Each carries a category hero that belongs in
    // Image Search ("balayage hair", "keratin treatment", etc.).
    ...SERVICE_CATEGORIES.map((c): MetadataRoute.Sitemap[number] => {
      const img = toAbsImage(c.heroImage);
      return {
        url: `${baseUrl}/services/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
        ...(img ? { images: [img] } : {}),
      };
    }),
    { url: `${baseUrl}/team`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(galleryImgs.length ? { images: galleryImgs } : {}),
    },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/book`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];
  // De-dupe by absolute URL — Round-26 SEO audit flagged the
  // sitemap.xml as "invalid format" once a stylist and an
  // admin_users row started sharing a slug (both queries here emit
  // /team/<slug>). Keeping the *first* entry preserves the priority
  // from the dedicated stylist entry over the staff fallback.
  const seen = new Set<string>();
  const all: MetadataRoute.Sitemap = [];
  for (const entry of [...statics, ...(await dynamicEntries())]) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    all.push(entry);
  }
  return all;
}
