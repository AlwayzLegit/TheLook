import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { strings } from "@/lib/strings";

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
// fallbacks. Meant for server components / route handlers / emails. A DB
// error or missing row returns the fallback so the UI always renders.
export async function getBranding(): Promise<Branding> {
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
