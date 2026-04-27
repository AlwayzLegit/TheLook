import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminAppointmentPatchSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sendStatusChangeEmail } from "@/lib/email";
import { sendStatusChangeSMS } from "@/lib/sms";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await request.json();
  const parsed = adminAppointmentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid appointment payload.", 400);
  }
  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }
  const payload = parsed.data;

  const updateData: Record<string, unknown> = {};

  if (payload.status) updateData.status = payload.status;
  if (payload.staff_notes !== undefined) updateData.staff_notes = payload.staff_notes;
  if (payload.date) updateData.date = payload.date;
  if (payload.start_time) updateData.start_time = payload.start_time;
  if (payload.end_time) updateData.end_time = payload.end_time;
  if (payload.stylist_id) {
    updateData.stylist_id = payload.stylist_id;
    // When admin assigns a real stylist (often after an "Any" booking),
    // requested_stylist flips to true so the customer's confirmation
    // emails + dashboard chips stop showing the "Any Stylist" badge.
    updateData.requested_stylist = true;
    // Mirror the legacy single-service column too when services are
    // also being replaced — keeps the appointment row's service_id in
    // sync with the first appointment_services entry.
  }
  if (payload.services && payload.services.length > 0) {
    // Snapshot the service_id of the first line into the legacy
    // appointments.service_id column so dashboards / list APIs that
    // still read off it keep working.
    updateData.service_id = payload.services[0].service_id;
  }

  // Stamp approver info whenever a pending booking becomes confirmed.
  // Kept in its own object so we can cleanly retry without it if the DB
  // schema pre-dates the 20260419 salon_fixes migration (which added the
  // approved_at / approved_by columns).
  const approvalStamp: Record<string, unknown> = {};
  if (payload.status === "confirmed") {
    approvalStamp.approved_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvalStamp.approved_by = (session.user as any)?.email || (session.user as any)?.name || "admin";
  }

  updateData.updated_at = new Date().toISOString();

  let { data, error } = await supabase
    .from("appointments")
    .update({ ...updateData, ...approvalStamp })
    .eq("id", id)
    .select()
    .single();

  // If the approved_at/approved_by columns don't exist yet (migration not
  // applied), Supabase returns PGRST204 "Could not find the column ..." or
  // an error message containing the column name. Retry without the stamp
  // so Confirm still works on older schemas.
  if (error && /approved_(at|by)/i.test(error.message || "")) {
    logError("admin/appointments PATCH (approval-stamp cols missing, retrying)", error);
    ({ data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single());
  }

  if (error) {
    logError("admin/appointments PATCH", error);
    return apiError(`Failed to update appointment: ${error.message || "unknown error"}`, 500);
  }

  // Replace appointment_services when the admin sent a new services
  // list inline. Delete-then-insert keeps the legacy snapshot model
  // intact (each line keeps its own price/duration) and is fine
  // outside a transaction because we restore the previous rows if the
  // insert fails. The PATCH itself has already succeeded so a
  // services-replace failure is a partial-success — we surface the
  // error so the admin can retry rather than silently dropping it.
  if (payload.services && payload.services.length > 0) {
    const { data: previous, error: fetchPrevErr } = await supabase
      .from("appointment_services")
      .select("service_id, variant_id, sort_order, price_min, duration, duration_minutes")
      .eq("appointment_id", id);
    if (fetchPrevErr) {
      logError("admin/appointments PATCH (services snapshot)", fetchPrevErr);
    }
    const { error: deleteErr } = await supabase
      .from("appointment_services")
      .delete()
      .eq("appointment_id", id);
    if (deleteErr) {
      logError("admin/appointments PATCH (services delete)", deleteErr);
      return apiError(`Failed to update services: ${deleteErr.message || "unknown"}`, 500);
    }
    const newRows = payload.services.map((line, i) => ({
      appointment_id: id,
      service_id: line.service_id,
      variant_id: null,
      sort_order: typeof line.sort_order === "number" ? line.sort_order : i,
      price_min: line.price_min,
      duration: line.duration,
      // Mirror duration into the legacy duration_minutes column for
      // any reader that still walks the older field — the appointment
      // create path does the same on insert.
      duration_minutes: line.duration,
    }));
    const { error: insertErr } = await supabase
      .from("appointment_services")
      .insert(newRows);
    if (insertErr) {
      logError("admin/appointments PATCH (services insert)", insertErr);
      // Restore the previous rows so the appointment isn't left with
      // zero line items. Best-effort — if the restore also fails the
      // admin will see an explicit error and can re-edit.
      if (previous && previous.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const restoreRows = (previous as any[]).map((p) => ({
          appointment_id: id,
          service_id: p.service_id,
          variant_id: p.variant_id,
          sort_order: p.sort_order,
          price_min: p.price_min,
          duration: p.duration,
          duration_minutes: p.duration_minutes ?? p.duration,
        }));
        await supabase.from("appointment_services").insert(restoreRows);
      }
      return apiError(`Failed to save updated services: ${insertErr.message || "unknown"}`, 500);
    }
  }

  logAdminAction("appointment.update", JSON.stringify(payload), id);

  // Send email + SMS on meaningful status transitions only. Clients
  // don't benefit from a "your booking was marked completed" ping —
  // they already know they were just in the chair. Same for no_show.
  // Keep the notifications for:
  //   • pending → confirmed  (your booking is locked in)
  //   • any     → cancelled  (your booking was cancelled)
  // (QA 2026-04-22 P2-#2).
  const newStatus = payload.status;
  if (newStatus && data && (newStatus === "confirmed" || newStatus === "cancelled")) {
    const { data: mappings } = await supabase
      .from("appointment_services")
      .select("service_id, sort_order")
      .eq("appointment_id", id)
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = (mappings || []).map((m: any) => m.service_id);
    const lookupIds = ids.length > 0 ? ids : [data.service_id];
    const { data: services } = await supabase.from("services").select("id, name").in("id", lookupIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byId = Object.fromEntries((services || []).map((s: any) => [s.id, s.name]));
    const serviceName = lookupIds.map((sid: string) => byId[sid]).filter(Boolean).join(", ") || "Your Service";
    const { data: stylist } = await supabase.from("stylists").select("name").eq("id", data.stylist_id).single();
    sendStatusChangeEmail({
      clientName: data.client_name,
      clientEmail: data.client_email,
      serviceName,
      stylistName: stylist?.name || "Your Stylist",
      date: data.date,
      startTime: data.start_time,
      newStatus,
      cancelToken: data.cancel_token,
      // Customer picked "Any Stylist" — show the neutral label in the
      // confirmation / cancellation email so they don't see a name they
      // didn't choose.
      anyStylist: data.requested_stylist === false,
    }).catch((err) => logError("status-email", err));

    // Parallel SMS, gated by the client having a phone + the admin
    // having SMS enabled globally + sms_booking_status_change_enabled.
    if (data.client_phone) {
      sendStatusChangeSMS({
        phone: data.client_phone,
        clientName: data.client_name,
        serviceName,
        date: data.date,
        time: data.start_time,
        newStatus,
        appointmentId: id,
        clientEmail: data.client_email,
      }).catch((err) => logError("status-sms", err));
    }

    // Stylist-targeted dashboard notification is off until stylist accounts
    // come back. Admins see every status change via the admin bell already.
  }

  // Auto-fire the review request whenever an appointment flips to
  // "completed" — gated by the auto_review_request_enabled setting,
  // ON by default. Idempotent thanks to review_request_sent_at, so
  // an admin re-marking a row completed won't double-send.
  if (newStatus === "completed" && data) {
    try {
      const { getSetting } = await import("@/lib/settings");
      const autoEnabled = (await getSetting("auto_review_request_enabled")) ?? "true";
      if (autoEnabled !== "false") {
        const { sendReviewRequest } = await import("@/lib/reviewRequest");
        // Fire-and-forget — the PATCH response shouldn't block on
        // SMS/email round-trips. Errors land in lib/reviewRequest's
        // own logError calls.
        sendReviewRequest(id, { trigger: "auto" })
          .then((r) => {
            if (r.ok) {
              logAdminAction(
                "review_request.sent",
                JSON.stringify({
                  appointmentId: id,
                  smsOk: r.smsOk,
                  emailOk: r.emailOk,
                  trigger: "auto",
                }),
              ).catch(() => {});
            }
          })
          .catch((err) => logError("auto review-request", err));
      }
    } catch (err) {
      logError("auto review-request init", err);
    }
  }

  return apiSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    logError("admin/appointments DELETE", error);
    return apiError("Failed to delete appointment.", 500);
  }

  logAdminAction("appointment.delete", JSON.stringify({ id }), id);

  return apiSuccess({ success: true });
}
