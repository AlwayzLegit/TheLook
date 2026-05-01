import { unstable_cache } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";

// Server-side helper for the four home-page gallery sections. Each
// of the four wrapper components (HaircutsGallery, ColorGallery,
// StylingGallery, TreatmentsGallery) calls getHomeSectionImages()
// at request time to fetch the owner-managed photos.
//
// Cached via unstable_cache + a tag the admin write paths can bust
// (HOME_GALLERY_CACHE_TAG). Same shape as getBranding() so the home
// page renders without per-section round trips.

export const HOME_GALLERY_CACHE_TAG = "home-gallery";

export type HomeSection = "haircuts" | "color" | "styling" | "treatments";

export interface HomeSectionImage {
  id: string;
  section: HomeSection;
  image_url: string;
  alt: string | null;
  sort_order: number;
  active: boolean;
}

async function fetchAllHomeSectionImages(): Promise<HomeSectionImage[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data, error } = await supabase
      .from("home_section_images")
      .select("id, section, image_url, alt, sort_order, active")
      .eq("active", true)
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data as HomeSectionImage[];
  } catch {
    return [];
  }
}

const cachedFetch = unstable_cache(fetchAllHomeSectionImages, ["home-section-images"], {
  revalidate: 60,
  tags: [HOME_GALLERY_CACHE_TAG],
});

// Public fetch helper used by the section wrappers. Returns the
// rows already filtered to one section, in sort order. Rows with
// no alt text get an empty string (component-side knows how to
// handle it).
export async function getHomeSectionImages(section: HomeSection): Promise<HomeSectionImage[]> {
  const all = await cachedFetch();
  return all.filter((r) => r.section === section);
}
