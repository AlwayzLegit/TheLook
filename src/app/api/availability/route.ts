import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";
import { NextRequest } from "next/server";

// GET /api/availability?stylistId=<uuid|any>&serviceIds=<csv>&date=<YYYY-MM-DD>
//
// When stylistId === "any" (the new step-order picks date/time before
// stylist), the route returns the UNION of slots free for any stylist
// who offers every selected service. The booking POST later resolves the
// concrete stylist when "Any Stylist" is chosen.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stylistIdRaw = searchParams.get("stylistId");
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceIds = searchParams.getAll("serviceIds");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!stylistIdRaw || !date) {
    return apiError("stylistId and date are required.", 400);
  }

  // Combine repeated ?serviceIds=&serviceIds= params with a CSV form so
  // both client patterns work.
  const idsFromCsv = serviceIdsParam
    ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const ids = serviceIds.length > 0
    ? serviceIds
    : idsFromCsv.length > 0
      ? idsFromCsv
      : serviceId
        ? [serviceId]
        : [];

  if (ids.length === 0) {
    return apiError("At least one serviceId is required.", 400);
  }

  const wantsAny = stylistIdRaw === "any" || stylistIdRaw === BOOKING.ANY_STYLIST_ID;

  if (!wantsAny) {
    const slots = await getAvailableSlots(stylistIdRaw, ids, date);
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
    const slots = await getAvailableSlots(s.id, ids, date);
    for (const slot of slots) slotSet.add(slot);
  }
  const slots = [...slotSet].sort();
  return apiSuccess({ slots });
}
