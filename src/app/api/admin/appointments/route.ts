import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { getAvailableSlots } from "@/lib/availability";
import { computeRequiredDeposit } from "@/lib/depositRules";
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

  // Note: the daily Vercel cron at /api/cron/purge-archived owns the purge
  // now (B-19/20). Read-path lazy purge was removed so the admin list GET
  // doesn't pay that cost on every load.

  const buildQuery = (opts: { archive: boolean }) => {
    let q = supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });
    if (opts.archive) {
      q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
    }
    if (dateFrom) q = q.gte("date", dateFrom);
    if (dateTo) q = q.lte("date", dateTo);
    if (status) q = q.eq("status", status);
    if (stylistId) q = q.eq("stylist_id", stylistId);
    return q;
  };

  // Self-healing retry for envs where the archived_at migration hasn't
  // landed yet.
  let { data: rows, error } = await buildQuery({ archive: true });
  if (error && /archived_at/i.test(error.message || "")) {
    if (archived) return apiSuccess([]);
    ({ data: rows, error } = await buildQuery({ archive: false }));
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
        .select("appointment_id, service_id, sort_order, price_min, duration")
        .in("appointment_id", apptIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // Pull deposit charge state for the listed appointments so the
  // modal + inline list can show "$X deposit paid" vs "$X deposit
  // refunded" / "$X deposit pending". Prefer the most-recent
  // refunded row when both refunded and succeeded exist for the
  // same appointment (rare — only happens during a partial-refund
  // window before the webhook reconciles).
  const { data: depositCharges } = apptIds.length > 0
    ? await supabase
        .from("charges")
        .select("appointment_id, status, amount, updated_at")
        .in("appointment_id", apptIds)
        .eq("type", "deposit")
    : { data: [] };
  const chargeByAppt = new Map<string, { status: string; amount: number }>();
  for (const c of (depositCharges || []) as Array<{
    appointment_id: string;
    status: string;
    amount: number;
    updated_at: string | null;
  }>) {
    const existing = chargeByAppt.get(c.appointment_id);
    if (!existing) {
      chargeByAppt.set(c.appointment_id, { status: c.status, amount: c.amount });
      continue;
    }
    // Refunded wins over succeeded so the UI never says "paid" for
    // a refunded booking. Beyond that, a later updated_at wins.
    if (c.status === "refunded" && existing.status !== "refunded") {
      chargeByAppt.set(c.appointment_id, { status: c.status, amount: c.amount });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries((allServices || []).map((s: any) => [s.id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistMap = Object.fromEntries((allStylists || []).map((s: any) => [s.id, s]));

  // Group mappings by appointment_id. `lines` keeps the booking-time
  // snapshot (price_min/duration) per service so consumers don't recompute
  // revenue against the current services table. Fall back to the current
  // services row when a legacy pre-snapshot row has null.
  type Line = { service_id: string; price_min: number | null; duration: number | null };
  const servicesByAppt = new Map<string, string[]>();
  const linesByAppt = new Map<string, Line[]>();
  for (const m of (mappings || []) as Line[] & { appointment_id: string }[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = m as any;
    const ids = servicesByAppt.get(mm.appointment_id) || [];
    ids.push(mm.service_id);
    servicesByAppt.set(mm.appointment_id, ids);
    const lines = linesByAppt.get(mm.appointment_id) || [];
    lines.push({ service_id: mm.service_id, price_min: mm.price_min ?? null, duration: mm.duration ?? null });
    linesByAppt.set(mm.appointment_id, lines);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (rows || []).map((a: any) => {
    const ids = servicesByAppt.get(a.id) || (a.service_id ? [a.service_id] : []);
    const serviceNames = ids.map((id) => serviceMap[id]?.name).filter(Boolean);
    const lines = linesByAppt.get(a.id) || (a.service_id ? [{ service_id: a.service_id, price_min: null, duration: null }] : []);
    const priceMinSnapshot = lines.reduce((sum: number, l: Line) => {
      if (l.price_min != null) return sum + l.price_min;
      return sum + (serviceMap[l.service_id]?.price_min || 0);
    }, 0);
    return {
      ...a,
      serviceIds: ids,
      serviceName: serviceNames.join(", ") || serviceMap[a.service_id]?.name,
      serviceNames,
      serviceLines: lines,
      // Convenience field so analytics + commissions pages don't each have
      // to fold price_min/duration themselves.
      totalPriceMin: priceMinSnapshot,
      stylistName: stylistMap[a.stylist_id]?.name,
      // Render-friendly deposit state. "none" when the booking
      // didn't require a deposit; "paid" / "refunded" / "pending"
      // otherwise. Computed from the charges ledger so partial
      // refunds (still "paid") read the same as full payments,
      // and full refunds read distinctly.
      deposit_status: (() => {
        const required = a.deposit_required_cents || 0;
        if (required <= 0) return "none";
        const charge = chargeByAppt.get(a.id);
        if (charge?.status === "refunded") return "refunded";
        if (a.stripe_customer_id || charge?.status === "succeeded") return "paid";
        return "pending";
      })(),
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
  // Phone is required across the booking surface — A2P 10DLC + day-of
  // reminders both depend on reachable numbers. Admin bookings follow
  // the same rule to keep /admin and /book consistent.
  clientPhone: z.string().trim().min(7, "Phone is required.").max(50),
  notes: z.string().trim().max(2000).optional().nullable(),
  staffNotes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["pending", "confirmed", "completed"]).default("confirmed"),
  overrideConflicts: z.boolean().optional(),
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
      .select("id, service_id, name, duration, price_min, price_text")
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
      priceMin: v?.price_min ?? svc.price_min ?? 0,
    };
  });
  const totalDuration = effective.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalPriceMin = effective.reduce((sum, e) => sum + (e.priceMin || 0), 0);
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

  const adminDepositCalc = await computeRequiredDeposit({
    totalPriceCents: totalPriceMin,
    totalDurationMinutes: totalDuration,
  });

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
    deposit_required_cents: adminDepositCalc.depositCents,
    approved_at: p.status === "confirmed" ? new Date().toISOString() : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approved_by: p.status === "confirmed" ? ((session.user as any)?.email || "admin") : null,
  };
  const { error: insertErr } = await supabase.from("appointments").insert(insertPayload);
  if (insertErr) {
    logError("admin/appointments POST", insertErr);
    return apiError(`Failed to create appointment: ${insertErr.message}`, 500);
  }

  // Snapshot price + duration at booking time so historical revenue
  // doesn't shift when a service is later re-priced (migration 20260430).
  const mappingRows = effective.map((e, i) => ({
    appointment_id: appointmentId,
    service_id: e.serviceId,
    variant_id: e.variantId,
    sort_order: i,
    price_min: e.priceMin,
    duration: e.duration,
    // Defensive — see /api/appointments for the duration_minutes story.
    duration_minutes: e.duration,
  }));
  const { error: mErr } = await supabase.from("appointment_services").insert(mappingRows);
  if (mErr) {
    logError("admin/appointments POST (services)", mErr);
    // Compensate — don't leave an orphan appointment without line items.
    await supabase.from("appointments").delete().eq("id", appointmentId).then(
      () => {},
      (e: unknown) => logError("admin/appointments POST (services rollback)", e),
    );
    return apiError(`Failed to save appointment services: ${mErr.message || "unknown"}`, 500);
  }

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
