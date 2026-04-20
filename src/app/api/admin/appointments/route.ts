import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { getAvailableSlots } from "@/lib/availability";
import { BOOKING } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import { NextRequest } from "next/server";

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

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
  // "true" -> archived tab (show only archived), anything else -> active list.
  const archived = searchParams.get("archived") === "true";
  // B-27: hide is_test rows by default; admin can opt-in via ?includeTest=true.
  const includeTest = searchParams.get("includeTest") === "true";

  // Lazy purge: any archived appointment older than 30 days gets deleted
  // on the next admin list load. Cheap with the partial index on
  // archived_at. Fire-and-forget so a purge failure doesn't block the UI.
  supabase.rpc("fn_purge_archived_appointments").then(
    () => {},
    (err: unknown) => logError("admin/appointments purge-archived", err),
  );

  const buildQuery = (opts: { archive: boolean; testFilter: boolean }) => {
    let q = supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });
    if (opts.archive) {
      q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
    }
    if (opts.testFilter && !includeTest) q = q.eq("is_test", false);
    if (dateFrom) q = q.gte("date", dateFrom);
    if (dateTo) q = q.lte("date", dateTo);
    if (status) q = q.eq("status", status);
    if (stylistId) q = q.eq("stylist_id", stylistId);
    return q;
  };

  // Retry strategy mirrors the approved_at pattern: drop whichever filter
  // the schema doesn't know yet so a schema-behind admin still gets data.
  let { data: rows, error } = await buildQuery({ archive: true, testFilter: true });
  if (error && /is_test/i.test(error.message || "")) {
    logError("admin/appointments GET (is_test col missing, retrying)", error);
    ({ data: rows, error } = await buildQuery({ archive: true, testFilter: false }));
  }
  if (error && /archived_at/i.test(error.message || "")) {
    logError("admin/appointments GET (archived_at col missing, retrying)", error);
    if (archived) return apiSuccess([]);
    ({ data: rows, error } = await buildQuery({ archive: false, testFilter: false }));
  }

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

// POST — admin creates a booking on behalf of a client (walk-ins, phone
// reservations, comp appointments). Skips Turnstile + rate-limits that the
// public /api/appointments endpoint enforces. Admins can also explicitly
// override conflict detection to double-book or squeeze someone in.
const adminBookingSchema = z.object({
  serviceIds: z.array(z.string().uuid()).min(1).max(8),
  variantIds: z.array(z.string().uuid().or(z.literal(""))).max(8).optional(),
  stylistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  staffNotes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["pending", "confirmed", "completed"]).default("confirmed"),
  overrideConflicts: z.boolean().optional(),
  // Admin-marked test booking — excluded from emails, analytics, dashboard
  // counts, and crons. Defaults false so accidental flagging takes intent.
  isTest: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  const parsed = adminBookingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid booking.", 400);
  }
  const p = parsed.data;

  const { data: services, error: svcErr } = await supabase
    .from("services")
    .select("id, name, duration, price_min")
    .in("id", p.serviceIds);
  if (svcErr || !services || services.length === 0) {
    return apiError("One or more services not found.", 404);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svcMap = new Map((services as any[]).map((s) => [s.id, s]));

  const pickedVariantIds = (p.variantIds || []).filter((v) => v && v.length > 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variantsById = new Map<string, any>();
  if (pickedVariantIds.length > 0) {
    const { data: vrows } = await supabase
      .from("service_variants")
      .select("id, service_id, name, duration, price_min")
      .in("id", pickedVariantIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const v of (vrows || []) as any[]) variantsById.set(v.id, v);
  }

  const effective = p.serviceIds.map((sid, i) => {
    const vid = (p.variantIds || [])[i];
    const v = vid ? variantsById.get(vid) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = svcMap.get(sid) as any;
    if (!svc) throw new Error("service missing");
    return {
      serviceId: sid,
      variantId: v?.id ?? null,
      displayName: v ? `${svc.name} — ${v.name}` : svc.name,
      duration: v?.duration ?? svc.duration,
    };
  });
  const totalDuration = effective.reduce((sum, e) => sum + (e.duration || 0), 0);
  const endTime = minutesToTime(timeToMinutes(p.startTime) + totalDuration);

  if (!p.overrideConflicts) {
    const slots = await getAvailableSlots(p.stylistId, p.serviceIds, p.date, totalDuration);
    if (!slots.includes(p.startTime)) {
      return apiError(
        "This time conflicts with an existing booking or is outside business hours. Tick 'Override conflicts' to book anyway.",
        409,
      );
    }
  }

  const appointmentId = crypto.randomUUID();
  const cancelToken = crypto.randomUUID().replace(/-/g, "");

  const insertPayload: Record<string, unknown> = {
    id: appointmentId,
    service_id: p.serviceIds[0],
    stylist_id: p.stylistId,
    date: p.date,
    start_time: p.startTime,
    end_time: endTime,
    status: p.status,
    client_name: p.clientName,
    client_email: p.clientEmail,
    client_phone: p.clientPhone || null,
    notes: p.notes || null,
    staff_notes: p.staffNotes || null,
    cancel_token: cancelToken,
    requested_stylist: true,
    policy_accepted_at: new Date().toISOString(),
    deposit_required_cents: totalDuration >= BOOKING.DEPOSIT_TRIGGER_MINUTES ? BOOKING.DEPOSIT_AMOUNT_CENTS : 0,
    approved_at: p.status === "confirmed" ? new Date().toISOString() : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approved_by: p.status === "confirmed" ? ((session.user as any)?.email || "admin") : null,
    is_test: p.isTest === true,
  };
  let { error: insertErr } = await supabase.from("appointments").insert(insertPayload);
  if (insertErr && /is_test/i.test(insertErr.message || "")) {
    delete insertPayload.is_test;
    ({ error: insertErr } = await supabase.from("appointments").insert(insertPayload));
  }
  if (insertErr) {
    logError("admin/appointments POST", insertErr);
    return apiError(`Failed to create appointment: ${insertErr.message}`, 500);
  }

  const mappingRows = effective.map((e, i) => ({
    appointment_id: appointmentId,
    service_id: e.serviceId,
    variant_id: e.variantId,
    sort_order: i,
  }));
  const { error: mErr } = await supabase.from("appointment_services").insert(mappingRows);
  if (mErr) logError("admin/appointments POST (services)", mErr);

  await logAdminAction(
    "appointment.create",
    JSON.stringify({
      client: p.clientEmail,
      date: p.date,
      time: p.startTime,
      stylistId: p.stylistId,
      status: p.status,
      override: !!p.overrideConflicts,
    }),
    appointmentId,
  );

  await createNotification({
    toAllAdmins: true,
    type: "booking.admin_created",
    title: `Admin booking: ${p.clientName}`,
    body: `${effective.map((e) => e.displayName).join(", ")} on ${p.date} at ${p.startTime}` +
      (p.status === "pending" ? " (pending)" : ""),
    appointmentId,
    url: `/admin/appointments?focus=${appointmentId}`,
  });

  return apiSuccess({ id: appointmentId, endTime, status: p.status, totalDuration });
}
