import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { BOOKING } from "@/lib/constants";

export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  // Exclude the "Any Stylist" sentinel row — the booking picker renders its
  // own Any-Stylist tile, and if the sentinel also surfaces here the
  // customer sees two tiles that mean the same thing. Also exclude any
  // other stylist that someone accidentally named "Any Stylist" to dedupe.
  const { data: allStylists, error: stylistsError } = await supabase
    .from("stylists")
    .select("*")
    .eq("active", true)
    .neq("id", BOOKING.ANY_STYLIST_ID)
    .not("name", "ilike", "any stylist")
    .order("sort_order", { ascending: true });

  if (stylistsError) {
    logError("stylists GET", stylistsError);
    return apiError("Failed to fetch stylists.", 500);
  }

  const { data: allMappings, error: mappingsError } = await supabase
    .from("stylist_services")
    .select("*");

  if (mappingsError) {
    logError("stylists GET (mappings)", mappingsError);
    return apiError("Failed to fetch stylist services.", 500);
  }

  const parseSpecialties = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw !== "string") return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Legacy data might be a comma-separated string. Don't crash the
      // booking page just because one stylist has malformed specialties.
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (allStylists || []).map((s: any) => ({
    ...s,
    imageUrl: s.image_url ?? null,
    specialties: parseSpecialties(s.specialties),
    serviceIds: (allMappings || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.stylist_id === s.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.service_id),
  }));

  return apiSuccess(result);
}
