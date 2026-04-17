import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const status = searchParams.get("status");
  const stylistId = searchParams.get("stylistId");

  let query = supabase
    .from("appointments")
    .select("*")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (status) query = query.eq("status", status);
  if (stylistId) query = query.eq("stylist_id", stylistId);

  const { data: rows, error } = await query;

  if (error) {
    logError("admin/appointments GET", error);
    return apiError("Failed to fetch appointments.", 500);
  }

  const { data: allServices } = await supabase.from("services").select("*");
  const { data: allStylists } = await supabase.from("stylists").select("*");
  const apptIds = (rows || []).map((a: { id: string }) => a.id);
  const { data: mappings } = apptIds.length > 0
    ? await supabase
        .from("appointment_services")
        .select("appointment_id, service_id, sort_order")
        .in("appointment_id", apptIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries((allServices || []).map((s: any) => [s.id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistMap = Object.fromEntries((allStylists || []).map((s: any) => [s.id, s]));

  // Group mappings by appointment_id
  const servicesByAppt = new Map<string, string[]>();
  for (const m of mappings || []) {
    const list = servicesByAppt.get(m.appointment_id) || [];
    list.push(m.service_id);
    servicesByAppt.set(m.appointment_id, list);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (rows || []).map((a: any) => {
    const ids = servicesByAppt.get(a.id) || (a.service_id ? [a.service_id] : []);
    const serviceNames = ids.map((id) => serviceMap[id]?.name).filter(Boolean);
    return {
      ...a,
      serviceIds: ids,
      serviceName: serviceNames.join(", ") || serviceMap[a.service_id]?.name,
      serviceNames,
      stylistName: stylistMap[a.stylist_id]?.name,
    };
  });

  return apiSuccess(enriched);
}
