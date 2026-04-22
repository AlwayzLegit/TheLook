import { unstable_cache } from "next/cache";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { strings } from "@/lib/strings";

export const BRANDING_CACHE_TAG = "branding";

export interface Branding {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
}

// Defaults mirror src/lib/strings.ts so every consumer gets a usable value
// even before the owner has saved anything, and even when Supabase is down.
const fallback: Branding = {
  name: strings.salonName,
  tagline: strings.salonTagline,
  address: strings.salonAddress,
  phone: strings.salonPhone,
  email: strings.salonEmail,
};

const BRAND_KEYS = ["brand_name", "brand_tagline", "brand_address", "brand_phone", "brand_email"] as const;

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
      .in("key", BRAND_KEYS as unknown as string[]);
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
