import crypto from "node:crypto";
import { supabase } from "@/lib/supabase";
import { sendSMS } from "@/lib/sms";
import { getSetting } from "@/lib/settings";
import { sendRawEmail, brandedFromText } from "@/lib/email";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import { todayISOInLA } from "@/lib/datetime";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Single daily fan-out. Scheduled at 15:00 UTC = 08:00 PDT (PST drifts
// to 07:00 — owner accepts the DST shift, see brief).
//
// For every appointment on today's PT date whose status is confirmed or
// completed (and not archived), send:
//   • SMS  — only if the client has a phone AND opted in (sms_consent)
//            AND isn't in sms_opt_outs. Message body from
//            salon_settings.reminder_sms_template.
//   • Email — always when we have a client email. Subject + body from
//            salon_settings.reminder_email_(subject|body)_template.
//
// reminder_sent gate prevents double-sending if the cron is retried.

function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDate(d: string): string {
  if (!d) return "";
  const [y, mo, day] = d.split("-").map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return apiError("Unauthorized", 401);
  }

  const todayStr = todayISOInLA();
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";

  // Load templates once — fall back to compiled-in defaults if the row
  // is missing, so pre-migration installs still get reasonable copy.
  const [
    smsTpl, emailSubjectTpl, emailBodyTpl,
  ] = await Promise.all([
    getSetting("reminder_sms_template").then((v) => v || DEFAULT_TEMPLATES.reminder_sms_template),
    getSetting("reminder_email_subject_template").then((v) => v || DEFAULT_TEMPLATES.reminder_email_subject_template),
    getSetting("reminder_email_body_template").then((v) => v || DEFAULT_TEMPLATES.reminder_email_body_template),
  ]);

  const { data: todays, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", todayStr)
    .in("status", ["confirmed", "completed"])
    .is("archived_at", null)
    .eq("reminder_sent", false);

  if (error) {
    logError("cron/reminders GET", error);
    return apiError("Failed to fetch appointments.", 500);
  }

  const rows = todays || [];
  if (rows.length === 0) {
    return apiSuccess({ date: todayStr, sent: 0, smsSent: 0, emailSent: 0, skipped: 0 });
  }

  const apptIds = rows.map((a: { id: string }) => a.id);
  const [{ data: allServices }, { data: allStylists }, { data: mappings }] = await Promise.all([
    supabase.from("services").select("id, name"),
    supabase.from("stylists").select("id, name"),
    supabase.from("appointment_services").select("appointment_id, service_id, sort_order").in("appointment_id", apptIds).order("sort_order", { ascending: true }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries(((allServices as any[]) || []).map((s: any) => [s.id, s.name]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistMap = Object.fromEntries(((allStylists as any[]) || []).map((s: any) => [s.id, s.name]));
  const serviceIdsByAppt = new Map<string, string[]>();
  for (const m of (mappings || []) as Array<{ appointment_id: string; service_id: string }>) {
    const arr = serviceIdsByAppt.get(m.appointment_id) || [];
    arr.push(m.service_id);
    serviceIdsByAppt.set(m.appointment_id, arr);
  }

  let smsSent = 0, emailSent = 0, skipped = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const appt of rows as any[]) {
    const ids = serviceIdsByAppt.get(appt.id) || (appt.service_id ? [appt.service_id] : []);
    const serviceName = ids.map((id: string) => serviceMap[id]).filter(Boolean).join(", ") || "your appointment";
    const stylistName = stylistMap[appt.stylist_id] || "your stylist";
    const vars = {
      client_name: appt.client_name || "there",
      service: serviceName,
      stylist: stylistName,
      date: formatDate(appt.date),
      time: formatTime(appt.start_time),
      salon_name: "The Look Hair Salon",
      cancel_url: appt.cancel_token ? `${baseUrl}/book/cancel?token=${appt.cancel_token}` : "",
    };

    // Email — always when we have an address. Resend handles bounces.
    // Branded HTML + plain-text fallback so it visually matches the
    // submission / confirm emails (QA 2026-04-22 P2-#4).
    if (appt.client_email) {
      const text = renderTemplate(emailBodyTpl, vars);
      const subject = renderTemplate(emailSubjectTpl, vars);
      const ok = await sendRawEmail({
        to: appt.client_email,
        subject,
        text,
        html: brandedFromText({
          kicker: "Appointment reminder",
          headline: `See you today at ${vars.time}`,
          preheader: `Reminder: ${vars.service} with ${vars.stylist} today at ${vars.time}.`,
          text,
          ctaLabel: appt.cancel_token ? "Cancel or reschedule" : undefined,
          ctaUrl: appt.cancel_token ? `${baseUrl}/book/cancel?token=${appt.cancel_token}` : undefined,
        }),
      }).catch((e) => { logError("reminders email", e); return false; });
      if (ok) emailSent++;
    }

    // SMS — requires phone + consent. Opt-outs handled inside sendSMS.
    if (appt.client_phone && appt.sms_consent === true) {
      const ok = await sendSMS({
        to: appt.client_phone,
        event: "booking.reminder",
        appointmentId: appt.id,
        clientEmail: appt.client_email || null,
        body: renderTemplate(smsTpl, vars),
      }).catch((e) => { logError("reminders sms", e); return false; });
      if (ok) smsSent++;
    } else {
      skipped++;
    }

    await supabase.from("appointments").update({ reminder_sent: true }).eq("id", appt.id);
  }

  return apiSuccess({ date: todayStr, appointments: rows.length, smsSent, emailSent, skipped });
}
