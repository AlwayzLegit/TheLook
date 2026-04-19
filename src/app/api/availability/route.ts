import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";
import { NextRequest } from "next/server";

// GET /api/availability?stylistId=<uuid|any>&serviceIds=<csv>&date=<YYYY-MM-DD>
//   &variantIds=<csv>
//
// When stylistId === "any" (the new step-order picks date/time before
// stylist), the route returns the UNION of slots free for any stylist
// who offers every selected service. The booking POST later resolves the
// concrete stylist when "Any Stylist" is chosen.
//
// Optional variantIds (aligned by index with serviceIds) let the caller
// request variant-aware slot durations so Brow + Lip (10+10) don't get
// evaluated against the parent service's 10-minute duration.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stylistIdRaw = searchParams.get("stylistId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!stylistIdRaw || !date) {
    return apiError("stylistId and date are required.", 400);
  }

  // Parse serviceIds supporting THREE input patterns, all of which the
  // booking flow uses in different screens:
  //   1. ?serviceIds=A&serviceIds=B          (repeated, StylistPicker)
  //   2. ?serviceIds=A,B                     (CSV, DateTimePicker)
  //   3. ?serviceIds=A,B&serviceIds=C,D      (mixed — defensive)
  // Earlier code picked the raw `getAll` array when non-empty, which for
  // pattern 2 produced `["A,B"]` — a single bogus id that matched nothing
  // and made the availability query return zero slots. Flatten + split
  // every entry so every pattern arrives as the same string[] of real ids.
  const flattenCsv = (arr: string[]): string[] =>
    arr
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);

  const rawServiceIds = searchParams.getAll("serviceIds");
  const ids = rawServiceIds.length > 0
    ? flattenCsv(rawServiceIds)
    : serviceId
      ? [serviceId]
      : [];

  if (ids.length === 0) {
    return apiError("At least one serviceId is required.", 400);
  }

  // Same flattening story for variantIds — DateTimePicker sends them CSV,
  // StylistPicker sends them repeated.
  const rawVariantIds = searchParams.getAll("variantIds");
  const variantIds = rawVariantIds.length > 0
    ? rawVariantIds.flatMap((v) => v.split(",")).map((v) => v.trim())
    : [];

  // Compute a variant-aware duration override when any variantId is present.
  let durationOverride: number | undefined;
  const pickedV = variantIds.filter((v) => v && v.length > 0);
  if (pickedV.length > 0 && hasSupabaseConfig) {
    const { data: vrows } = await supabase
      .from("service_variants")
      .select("id, duration")
      .in("id", pickedV);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vById = new Map<string, number>(((vrows || []) as any[]).map((v) => [v.id, v.duration || 0]));
    const { data: srows } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", [...new Set(ids)]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sById = new Map<string, number>(((srows || []) as any[]).map((s) => [s.id, s.duration || 0]));
    durationOverride = ids.reduce((sum, sid, i) => {
      const vid = variantIds[i];
      if (vid && vById.has(vid)) return sum + (vById.get(vid) || 0);
      return sum + (sById.get(sid) || 0);
    }, 0);
  }

  const wantsAny = stylistIdRaw === "any" || stylistIdRaw === BOOKING.ANY_STYLIST_ID;

  if (!wantsAny) {
    const slots = await getAvailableSlots(stylistIdRaw, ids, date, durationOverride);
    return apiSuccess({ slots });
  }

  // Any-stylist union mode.
  if (!hasSupabaseConfig) {
    return apiSuccess({ slots: ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"] });
  }

  const { data: pairs } = await supabase
    .from("stylist_services")
    .select("stylist_id, service_id")
    .in("service_id", ids);
  const counts = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (pairs || []) as any[]) {
    counts.set(p.stylist_id, (counts.get(p.stylist_id) || 0) + 1);
  }
  const eligibleIds = [...counts.entries()]
    .filter(([, c]) => c >= ids.length)
    .map(([id]) => id);

  if (eligibleIds.length === 0) {
    return apiSuccess({ slots: [] });
  }

  const { data: stylists } = await supabase
    .from("stylists")
    .select("id, active")
    .in("id", eligibleIds)
    .eq("active", true);

  const slotSet = new Set<string>();
  for (const s of (stylists || []) as Array<{ id: string }>) {
    if (s.id === BOOKING.ANY_STYLIST_ID) continue;
    const slots = await getAvailableSlots(s.id, ids, date, durationOverride);
    for (const slot of slots) slotSet.add(slot);
  }
  const slots = [...slotSet].sort();
  return apiSuccess({ slots });
}
