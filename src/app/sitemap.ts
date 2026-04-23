import type { MetadataRoute } from "next";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";

// Sitemap is regenerated on Vercel's default ISR interval for dynamic
// metadata routes. We pull the stylist + service detail URLs from the
// DB so Google actually discovers them instead of only the index pages.
export const revalidate = 3600;

const baseUrl = "https://www.thelookhairsalonla.com";

async function dynamicEntries(): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabaseConfig) return [];
  const out: MetadataRoute.Sitemap = [];

  try {
    const { data: stylists } = await supabase
      .from("stylists")
      .select("slug, updated_at")
      .eq("active", true);
    for (const row of (stylists || []) as Array<{ slug: string | null; updated_at: string | null }>) {
      if (!row.slug) continue;
      out.push({
        url: `${baseUrl}/team/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // Pre-migration envs may not have the column — skip silently.
  }

  try {
    const { data: staff } = await supabase
      .from("admin_users")
      .select("slug, updated_at")
      .eq("active_for_public", true);
    for (const row of (staff || []) as Array<{ slug: string | null; updated_at: string | null }>) {
      if (!row.slug) continue;
      out.push({
        url: `${baseUrl}/team/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // Pre-migration envs
  }

  try {
    const { data: services } = await supabase
      .from("services")
      .select("slug, updated_at")
      .eq("active", true);
    for (const row of (services || []) as Array<{ slug: string | null; updated_at: string | null }>) {
      if (!row.slug) continue;
      out.push({
        url: `${baseUrl}/services/item/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {}

  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/services`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/team`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/gallery`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/book`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];
  return [...statics, ...(await dynamicEntries())];
}
