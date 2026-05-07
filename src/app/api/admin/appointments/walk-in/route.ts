import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";
import { z } from "zod";

// Quick-create a walk-in appointment. This is separate from the full
// /api/admin/appointments POST flow because walk-ins don't need
// availability validation, deposit rules, captcha, or confirmation
// emails — the customer is physically at the salon, so the usual
// booking guards are noise that slow Anna down at the counter.
//
// Body: { stylistId: uuid, serviceIds: uuid[], clientName?: string, clientPhone?: string }
//
// Defaults: name = "Walk-in", start_time = now rounded down to the
// nearest 5 min, end_time = start + summed service duration.
// Status lands as "confirmed" — walk-ins are already happening, no
// need for the staff to click Confirm afterwards.

const schema = z.object({
  stylistId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  clientName: z.string().trim().max(200).optional(),
  clientPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

function nowInLA(): { date: string; start: string } {
  // Pin to America/Los_Angeles so a walk-in at 5:59 PM on Friday doesn't
  // end up on Saturday's calendar when Vercel runs in a different TZ.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const date = `${lookup.year}-${lookup.month}-${lookup.day}`;
  const hour = parseInt(lookup.hour, 10);
  const minute = parseInt(lookup.minute, 10);
  // Round down to nearest 5 min so the calendar grid is clean.
  const rounded = Math.floor(minute / 5) * 5;
  const start = `${String(hour).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
  return { date, start };
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid walk-in payload.", 400);
  }

  const { stylistId, serviceIds } = parsed.data;
  const clientName = parsed.data.clientName?.trim() || "Walk-in";
  const clientPhone = parsed.data.clientPhone?.trim() || null;
  const notes = parsed.data.notes?.trim() || null;

  // Pull service durations server-side — trusting the client would let
  // a rogue UI save a 5-min "haircut" and take the stylist's day off
  // the grid.
  const { data: svcs, error: svcErr } = await supabase
    .from("services")
    .select("id, duration, price_min")
    .in("id", serviceIds);
  if (svcErr || !svcs) {
    logError("walk-in/services", svcErr);
    return apiError("Failed to look up services.", 500);
  }
  const durationMap = new Map<string, number>(
    (svcs as Array<{ id: string; duration: number | null }>).map((s) => [s.id, s.duration || 0]),
  );
  const totalMinutes = serviceIds.reduce((sum, id) => sum + (durationMap.get(id) || 0), 0);
  if (totalMinutes <= 0) {
    return apiError("Could not resolve service duration. Pick at least one service with a duration set.", 400);
  }

  const { date, start } = nowInLA();
  const end = addMinutes(start, totalMinutes);

  // Synthesize an internal email so legacy appointment rows (which
  // require non-null client_email) stay valid. Walk-in without an email
  // on file gets a sentinel that Anna can edit later from the detail
  // modal if the customer wants reminders.
  const email = `walk-in-${Date.now()}@thelookhairsalonla.local`;

  const { data: apptRow, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      service_id: serviceIds[0],
      stylist_id: stylistId,
      date,
      start_time: start,
      end_time: end,
      status: "confirmed",
      client_name: clientName,
      client_email: email,
      client_phone: clientPhone,
      notes,
      staff_notes: `Walk-in created by ${user.email}`,
    })
    .select("id")
    .single();

  if (apptErr || !apptRow) {
    logError("walk-in/insert", apptErr || { message: "no row" });
    return apiError(`Failed to create walk-in: ${apptErr?.message || "unknown"}`, 500);
  }

  // Mirror the multi-service mapping so reporting + commission paths
  // see all services attached to the walk-in. Snapshot price + duration
  // at booking time — without this the per-line edit modal falls back
  // to generic defaults and the catalog showing 25 min stays out of
  // sync with the line that was actually booked at 10 min.
  if (serviceIds.length > 0) {
    const priceMap = new Map<string, number>(
      (svcs as Array<{ id: string; duration: number | null; price_min?: number | null }>).map(
        (s) => [s.id, s.price_min ?? 0],
      ),
    );
    const rows = serviceIds.map((id, i) => ({
      appointment_id: apptRow.id,
      service_id: id,
      sort_order: i,
      price_min: priceMap.get(id) ?? 0,
      duration: durationMap.get(id) ?? 0,
      // Legacy NOT NULL column on prod — keep in sync with `duration`.
      duration_minutes: durationMap.get(id) ?? 0,
    }));
    const { error: mapErr } = await supabase.from("appointment_services").insert(rows);
    if (mapErr) {
      logError("walk-in/services mapping", mapErr);
      // Non-fatal — the appointment still exists, admin can fix later.
    }
  }

  await logAdminAction(
    "appointment.walk_in",
    JSON.stringify({ id: apptRow.id, stylistId, serviceIds, totalMinutes }),
  );

  return apiSuccess({ id: apptRow.id, date, start, end }, 201);
}
