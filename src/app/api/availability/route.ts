import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";
import { UUID_ISH } from "@/lib/validation";
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
  // Date must be YYYY-MM-DD; stylistId must be the "any" sentinel or a
  // canonical UUID. Without these guards a bad input falls through to
  // the service lookup, fails to resolve a row, and returns a stock
  // fallback slot list — masking the bad request as a successful
  // 200 response. QA caught this with stylistId=bad → 200.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return apiError("date must be YYYY-MM-DD.", 400);
  }
  const isAnySentinel =
    stylistIdRaw === "any" || stylistIdRaw === BOOKING.ANY_STYLIST_ID;
  if (!isAnySentinel && !UUID_ISH.test(stylistIdRaw)) {
    return apiError("Invalid stylistId.", 400);
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
  if (ids.some((id) => !UUID_ISH.test(id))) {
    return apiError("Invalid serviceId.", 400);
  }

  // Same flattening story for variantIds — DateTimePicker sends them CSV,
  // StylistPicker sends them repeated. Empty strings are valid (used as
  // a placeholder for "service in this slot has no variant picked").
  const rawVariantIds = searchParams.getAll("variantIds");
  const variantIds = rawVariantIds.length > 0
    ? rawVariantIds.flatMap((v) => v.split(",")).map((v) => v.trim())
    : [];
  if (variantIds.some((v) => v.length > 0 && !UUID_ISH.test(v))) {
    return apiError("Invalid variantId.", 400);
  }

  // Compute a variant-aware duration override when any variantId is present.
  let durationOverride: number | undefined;
  const pickedV = variantIds.filter((v) => v && v.length > 0);
  if (pickedV.length > 0 && hasSupabaseConfig) {
    const { data: vrows } = await supabase
      .from("service_variants")
      .select("id, duration")
      .in("id", pickedV);
    type DurationRow = { id: string; duration: number | null };
    const vById = new Map<string, number>(
      ((vrows || []) as DurationRow[]).map((v) => [v.id, v.duration || 0]),
    );
    const { data: srows } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", [...new Set(ids)]);
    type SvcDurationRow = { id: string; duration: number | null };
    const sById = new Map<string, number>(
      ((srows || []) as SvcDurationRow[]).map((s) => [s.id, s.duration || 0]),
    );
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

  // Eligibility for the Any-Stylist union: a stylist must offer every
  // service in the cart that ANY stylist is tagged with. Services with
  // zero tagged stylists fall back to "any stylist can do it" — the
  // alternative is that an admin tagging gap dead-ends customer
  // bookings completely (cowork-2026-05-07: cart=[Cut, Wash] returned
  // 0 slots because none of 5 active stylists were tagged with the
  // Hair Wash add-on, even though every stylist obviously could rinse
  // hair for 10 min). Untagged-fallback ensures a missing tag is a
  // soft warning rather than a hard outage.
  const uniqueIds = Array.from(new Set(ids));
  const { data: pairs } = await supabase
    .from("stylist_services")
    .select("stylist_id, service_id")
    .in("service_id", uniqueIds);
  type PairRow = { stylist_id: string; service_id: string };
  const stylistsByService = new Map<string, Set<string>>();
  for (const sid of uniqueIds) stylistsByService.set(sid, new Set());
  for (const p of (pairs || []) as PairRow[]) {
    stylistsByService.get(p.service_id)?.add(p.stylist_id);
  }
  const constrainingServices = uniqueIds.filter(
    (sid) => (stylistsByService.get(sid)?.size ?? 0) > 0,
  );

  // Pull the active stylist roster (excluding the Any sentinel — the
  // sentinel would never be in stylist_services anyway, and its row
  // is inactive on prod). Eligibility = covers every constraining
  // service. When there are no constraining services (e.g. a cart
  // entirely of untagged add-ons), every active stylist qualifies.
  const { data: allActive } = await supabase
    .from("stylists")
    .select("id, active")
    .eq("active", true)
    .neq("id", BOOKING.ANY_STYLIST_ID);

  const eligibleIds = ((allActive || []) as Array<{ id: string }>)
    .map((s) => s.id)
    .filter((id) =>
      constrainingServices.every((sid) => stylistsByService.get(sid)?.has(id)),
    );

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
