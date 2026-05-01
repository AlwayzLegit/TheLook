import { unstable_cache } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";

// Public-facing service summary used by the home-page gallery
// sections (HaircutsGallery, ColorGallery, etc). One row per
// service that should appear in its category's grid; consumers
// derive the photo URL + booking link from each row.
//
// Single source of truth: the services table the owner already
// manages at /admin/services. When the admin uploads / replaces /
// reorders a service photo there, the home page reflects it on
// the next render — no separate "section gallery" to keep in
// sync.

export const HOME_SERVICE_GALLERY_CACHE_TAG = "home-service-gallery";

export type HomeSection = "haircuts" | "color" | "styling" | "treatments";

export interface HomeServicePhoto {
  id: string;
  slug: string | null;
  name: string;
  image_url: string;
  sort_order: number;
}

// Maps the home-page section to the DB category name. Service
// rows store category as the human-readable label ("Color",
// "Haircuts", etc.) — same vocabulary the admin form's category
// dropdown uses, kept in lib/service-categories.ts.
const SECTION_TO_CATEGORY: Record<HomeSection, string> = {
  haircuts:   "Haircuts",
  color:      "Color",
  styling:    "Styling",
  treatments: "Treatments",
};

async function fetchAllHomeSectionServices(): Promise<HomeServicePhoto[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, slug, name, image_url, category, sort_order, active")
      .eq("active", true)
      .not("image_url", "is", null)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    // Trim to fields we want to expose. category is used for
    // server-side filtering only; consumers don't need it.
    return (data as Array<{
      id: string;
      slug: string | null;
      name: string;
      image_url: string | null;
      category: string;
      sort_order: number;
    }>)
      .filter((row) => typeof row.image_url === "string" && row.image_url.trim().length > 0)
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        image_url: row.image_url as string,
        sort_order: row.sort_order,
        // Stash category on the row so the public helper can
        // filter without re-querying. Hidden from the exported
        // type via the surrounding map().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ _category: row.category } as any),
      }));
  } catch {
    return [];
  }
}

const cachedFetch = unstable_cache(
  fetchAllHomeSectionServices,
  ["home-service-gallery"],
  { revalidate: 60, tags: [HOME_SERVICE_GALLERY_CACHE_TAG] },
);

// Public fetch helper used by the section wrappers. Returns the
// services in the requested section (filtered + ordered), already
// stripped of rows missing a photo.
export async function getServicesForHomeSection(section: HomeSection): Promise<HomeServicePhoto[]> {
  const all = await cachedFetch();
  const want = SECTION_TO_CATEGORY[section];
  return (all as Array<HomeServicePhoto & { _category?: string }>)
    .filter((row) => row._category === want)
    .map(({ id, slug, name, image_url, sort_order }) => ({ id, slug, name, image_url, sort_order }));
}
