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

  // Scope the join to only the active stylists we just fetched — pulling
  // the entire stylist_services table grew unbounded as inactive stylists
  // accumulated. Same idea for the services lookup below: only the
  // service_ids actually referenced are needed.
  type StylistRow = { id: string; image_url: string | null; specialties: unknown } & Record<string, unknown>;
  const stylistRows = (allStylists || []) as StylistRow[];
  const activeStylistIds = stylistRows.map((s) => s.id);

  type MappingRow = { stylist_id: string; service_id: string };
  const { data: allMappings, error: mappingsError } = activeStylistIds.length > 0
    ? await supabase
        .from("stylist_services")
        .select("stylist_id, service_id")
        .in("stylist_id", activeStylistIds)
    : { data: [] as MappingRow[], error: null };

  if (mappingsError) {
    logError("stylists GET (mappings)", mappingsError);
    return apiError("Failed to fetch stylist services.", 500);
  }

  const referencedServiceIds = Array.from(
    new Set(((allMappings || []) as MappingRow[]).map((m) => m.service_id)),
  );

  // Pull active service rows for the IDs referenced and key them by id so
  // we can resolve serviceIds → category list per stylist below. Listing
  // pages (/team and the home/about <Team /> component) want a short
  // summary line ("Cuts · Color · Styling") that reflects what each
  // stylist actually does, not just the free-text specialty tags admin
  // types into the stylist edit form.
  type ServiceRow = { id: string; name: string; category: string };
  const { data: allServices } = referencedServiceIds.length > 0
    ? await supabase
        .from("services")
        .select("id, name, category")
        .eq("active", true)
        .in("id", referencedServiceIds)
    : { data: [] as ServiceRow[] };

  const serviceById = new Map<string, { name: string; category: string }>(
    ((allServices || []) as ServiceRow[]).map((s) => [s.id, { name: s.name, category: s.category }]),
  );

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

  // Pre-bucket mappings by stylist_id so the per-stylist filter below is O(1)
  // instead of O(stylists × mappings).
  const serviceIdsByStylist = new Map<string, string[]>();
  for (const m of (allMappings || []) as MappingRow[]) {
    const list = serviceIdsByStylist.get(m.stylist_id) || [];
    list.push(m.service_id);
    serviceIdsByStylist.set(m.stylist_id, list);
  }

  const result = stylistRows.map((s) => {
    const serviceIds = serviceIdsByStylist.get(s.id) || [];

    // Distinct, ordered category list. We preserve insertion order
    // (first occurrence per category) so the most-prominent service
    // category for that stylist comes first on the public tile.
    const categorySet = new Set<string>();
    const categories: string[] = [];
    for (const id of serviceIds) {
      const svc = serviceById.get(id);
      if (!svc) continue;
      if (!categorySet.has(svc.category)) {
        categorySet.add(svc.category);
        categories.push(svc.category);
      }
    }

    return {
      ...s,
      imageUrl: s.image_url ?? null,
      specialties: parseSpecialties(s.specialties),
      serviceIds,
      // Service category names this stylist offers, deduped + ordered.
      // Public listing pages prefer this over `specialties` because
      // it's grounded in the actual stylist_services mapping, not
      // free-text tags that drift over time.
      categories,
    };
  });

  return apiSuccess(result);
}
