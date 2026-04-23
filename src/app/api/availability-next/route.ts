import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiSuccess } from "@/lib/apiResponse";
import { getAvailableSlots } from "@/lib/availability";
import { BOOKING } from "@/lib/constants";
import { todayISOInLA, addDaysISOInLA } from "@/lib/datetime";
import { NextRequest } from "next/server";

// GET /api/availability-next
//
// Optional query params:
//   stylistId   — if present, return the next available slot for THIS
//                 stylist only (used by StylistPicker tiles to show a
//                 "Next open: Sat 2:00 PM" hint). When "any" or omitted,
//                 scans every active stylist and returns the first slot
//                 any of them has free.
//   serviceIds  — repeated or CSV. Filters to stylists who offer every
//                 listed service + sums durations for correct overlap.
//                 When omitted, falls back to the first active service
//                 so the legacy "any slot anywhere" behavior still works.
//   variantIds  — aligned by index with serviceIds for variant-aware
//                 duration (e.g. Facial Hair Removal — Brow).
//
// Response shape: { nextSlot: { date, time } | null }. Clients render
// "No openings in the next 2 weeks" on a null result.

const SCAN_DAYS = 14;

function parseCsv(values: string[] | null): string[] {
  return (values || [])
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig) return apiSuccess({ nextSlot: null });

  const { searchParams } = request.nextUrl;
  const stylistIdRaw = searchParams.get("stylistId");
  const serviceIds = parseCsv(searchParams.getAll("serviceIds"));
  const variantIds = parseCsv(searchParams.getAll("variantIds"));
  const scopedStylist = stylistIdRaw && stylistIdRaw !== "any" && stylistIdRaw !== BOOKING.ANY_STYLIST_ID
    ? stylistIdRaw
    : null;

  // Resolve the service set the caller wants availability for. With no
  // serviceIds, fall back to the first active service so the legacy
  // "any slot anywhere, any service" behavior still works for callers
  // that just want a heartbeat of whether the salon has space.
  let ids = serviceIds;
  if (ids.length === 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id")
      .eq("active", true)
      .order("sort_order")
      .limit(1);
    if (!services?.length) return apiSuccess({ nextSlot: null });
    ids = [services[0].id];
  }

  // Variant-aware duration override so the scan doesn't offer a slot
  // the actual booking POST would reject. When a variant is set for a
  // service, its duration wins.
  let durationOverride: number | undefined;
  if (variantIds.some((v) => v)) {
    const picked = variantIds.filter(Boolean);
    const [vrowsRes, srowsRes] = await Promise.all([
      picked.length > 0
        ? supabase.from("service_variants").select("id, duration").in("id", picked)
        : Promise.resolve({ data: [] }),
      supabase.from("services").select("id, duration").in("id", [...new Set(ids)]),
    ]);
    type DurRow = { id: string; duration: number | null };
    const vById = new Map<string, number>(
      ((vrowsRes.data || []) as DurRow[]).map((v) => [v.id, v.duration || 0]),
    );
    const sById = new Map<string, number>(
      ((srowsRes.data || []) as DurRow[]).map((s) => [s.id, s.duration || 0]),
    );
    durationOverride = ids.reduce<number>((sum, id, i) => {
      const vId = variantIds[i];
      if (vId && vById.has(vId)) return sum + (vById.get(vId) || 0);
      return sum + (sById.get(id) || 0);
    }, 0);
  }

  // Stylist set to scan. Either the single scoped stylist OR every
  // active stylist who can perform every selected service.
  let stylistIds: string[];
  if (scopedStylist) {
    stylistIds = [scopedStylist];
  } else {
    const { data: pairs } = await supabase
      .from("stylist_services")
      .select("stylist_id, service_id")
      .in("service_id", ids);
    const counts = new Map<string, number>();
    for (const p of (pairs || []) as Array<{ stylist_id: string }>) {
      counts.set(p.stylist_id, (counts.get(p.stylist_id) || 0) + 1);
    }
    const eligibleIds = [...counts.entries()]
      .filter(([, c]) => c >= ids.length)
      .map(([id]) => id);
    if (eligibleIds.length === 0) return apiSuccess({ nextSlot: null });
    const { data: active } = await supabase
      .from("stylists")
      .select("id")
      .in("id", eligibleIds)
      .eq("active", true);
    stylistIds = ((active || []) as Array<{ id: string }>)
      .map((s) => s.id)
      .filter((id: string) => id !== BOOKING.ANY_STYLIST_ID);
    if (stylistIds.length === 0) return apiSuccess({ nextSlot: null });
  }

  // Scan SCAN_DAYS days starting today in LA. For scoped lookups the
  // inner loop runs once per day; for unscoped ("any") it cycles
  // through every eligible stylist per day and returns the first slot
  // found. Either way the first truthy result wins.
  for (let i = 0; i < SCAN_DAYS; i++) {
    const dateStr = i === 0 ? todayISOInLA() : addDaysISOInLA(i);
    for (const sid of stylistIds) {
      try {
        const slots = await getAvailableSlots(sid, ids, dateStr, durationOverride);
        if (slots.length > 0) {
          return apiSuccess({ nextSlot: { date: dateStr, time: slots[0] } });
        }
      } catch {
        // Ignore individual stylist errors and continue scanning.
      }
    }
  }

  return apiSuccess({ nextSlot: null });
}
