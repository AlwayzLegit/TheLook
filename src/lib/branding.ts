import { unstable_cache } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { strings } from "@/lib/strings";

export const BRANDING_CACHE_TAG = "branding";

// One slot per "singular" image on the public site that the salon
// owner / manager can override from /admin/branding. Each slot
// resolves to the override URL when one is saved, otherwise the
// hardcoded fallback path under /public/images/.
export interface BrandingImages {
  homeHero: string;
  aboutImage: string;
  footerBg: string;
  catHaircuts: string;
  catColor: string;
  catStyling: string;
  catTreatments: string;
}

export interface Branding {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  images: BrandingImages;
}

// Fallback image URLs match what each component used to hardcode
// before the /admin/branding override layer. Keeping them here so
// every consumer (Hero, About, Footer, /services/[slug] hero, etc.)
// resolves to the same default and a fresh install renders the same
// site as before this feature shipped.
const fallbackImages: BrandingImages = {
  homeHero:     "/images/hero/salon-main.jpg",
  aboutImage:   "/images/our-story.png",
  footerBg:     "/images/footer-hair-bg.png",
  catHaircuts:  "/images/Haircuts.jpg",
  catColor:     "/images/Highlights.jpg",
  catStyling:   "/images/Styling.jpg",
  catTreatments:"/images/Treatments.jpg",
};

// Defaults mirror src/lib/strings.ts so every consumer gets a usable value
// even before the owner has saved anything, and even when Supabase is down.
const fallback: Branding = {
  name: strings.salonName,
  tagline: strings.salonTagline,
  address: strings.salonAddress,
  phone: strings.salonPhone,
  email: strings.salonEmail,
  images: fallbackImages,
};

const BRAND_KEYS = ["brand_name", "brand_tagline", "brand_address", "brand_phone", "brand_email"] as const;

// /admin/branding writes overrides to these keys in salon_settings.
// One row per slot; null/missing → render the fallback path above.
export const BRANDING_IMAGE_KEYS = [
  "home_hero_url",
  "about_image_url",
  "footer_bg_url",
  "cat_haircuts_hero_url",
  "cat_color_hero_url",
  "cat_styling_hero_url",
  "cat_treatments_hero_url",
] as const;

export type BrandingImageKey = (typeof BRANDING_IMAGE_KEYS)[number];

const ALL_BRANDING_KEYS = [...BRAND_KEYS, ...BRANDING_IMAGE_KEYS] as const;

// Server helper: fetch branding from salon_settings KV with strings.ts
// fallbacks. Cached for 60s by Next's data cache (and invalidated on
// settings save via revalidateTag(BRANDING_CACHE_TAG)) so the root
// layout read doesn't turn every page dynamic.
async function fetchBranding(): Promise<Branding> {
  if (!hasSupabaseConfig) return fallback;
  try {
    const { data } = await supabase
      .from("salon_settings")
      .select("key, value")
      .in("key", ALL_BRANDING_KEYS as unknown as string[]);
    const map = new Map<string, string>();
    for (const row of (data || []) as Array<{ key: string; value: string | null }>) {
      if (row.value && row.value.trim().length > 0) map.set(row.key, row.value);
    }
    return {
      name:    map.get("brand_name")    ?? fallback.name,
      tagline: map.get("brand_tagline") ?? fallback.tagline,
      address: map.get("brand_address") ?? fallback.address,
      phone:   map.get("brand_phone")   ?? fallback.phone,
      email:   map.get("brand_email")   ?? fallback.email,
      images: {
        homeHero:      map.get("home_hero_url")          ?? fallbackImages.homeHero,
        aboutImage:    map.get("about_image_url")        ?? fallbackImages.aboutImage,
        footerBg:      map.get("footer_bg_url")          ?? fallbackImages.footerBg,
        catHaircuts:   map.get("cat_haircuts_hero_url")  ?? fallbackImages.catHaircuts,
        catColor:      map.get("cat_color_hero_url")     ?? fallbackImages.catColor,
        catStyling:    map.get("cat_styling_hero_url")   ?? fallbackImages.catStyling,
        catTreatments: map.get("cat_treatments_hero_url")?? fallbackImages.catTreatments,
      },
    };
  } catch {
    return fallback;
  }
}

export const getBranding = unstable_cache(fetchBranding, ["branding"], {
  revalidate: 60,
  tags: [BRANDING_CACHE_TAG],
});

// Pure helper for code paths that already have the raw settings map in hand
// (e.g. the admin settings page itself). No DB call; just apply fallbacks.
export function brandingFromSettings(raw: Record<string, string | null | undefined>): Branding {
  const pick = (k: keyof typeof raw, d: string) => {
    const v = raw[k];
    return v && String(v).trim().length > 0 ? String(v) : d;
  };
  return {
    name:    pick("brand_name", fallback.name),
    tagline: pick("brand_tagline", fallback.tagline),
    address: pick("brand_address", fallback.address),
    phone:   pick("brand_phone", fallback.phone),
    email:   pick("brand_email", fallback.email),
    images: {
      homeHero:      pick("home_hero_url", fallbackImages.homeHero),
      aboutImage:    pick("about_image_url", fallbackImages.aboutImage),
      footerBg:      pick("footer_bg_url", fallbackImages.footerBg),
      catHaircuts:   pick("cat_haircuts_hero_url", fallbackImages.catHaircuts),
      catColor:      pick("cat_color_hero_url", fallbackImages.catColor),
      catStyling:    pick("cat_styling_hero_url", fallbackImages.catStyling),
      catTreatments: pick("cat_treatments_hero_url", fallbackImages.catTreatments),
    },
  };
}

export const brandingDefaults = fallback;

// Normalize a human-entered phone ("(818) 662-5665", "818-662-5665",
// "+1 818 662 5665", etc.) into an E.164-ish tel: href. Keeps a leading
// "+" if present, strips everything non-digit, and prepends "+1" for
// plain 10-digit US numbers. Returns the input unchanged if it's empty.
export function telHref(phone: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hadPlus) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

// mailto: is simpler — just pass through, stripping leading/trailing space.
export function mailtoHref(email: string): string {
  const trimmed = (email || "").trim();
  return trimmed ? `mailto:${trimmed}` : "";
}
