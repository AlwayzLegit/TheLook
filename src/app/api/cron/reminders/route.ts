import crypto from "node:crypto";
import { supabase } from "@/lib/supabase";
import { sendSMS } from "@/lib/sms";
import { getSetting } from "@/lib/settings";
import { sendRawEmail, brandedFromText } from "@/lib/email";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import { addDaysISOInLA } from "@/lib/datetime";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Single daily fan-out. Scheduled at 22:00 UTC = 15:00 PDT (PST drifts
// to 14:00 — owner accepts the DST shift). Sends *day-before* reminders
// in the afternoon so clients still have business hours to cancel or
// reschedule (Round-26 owner request, replaces the prior same-day 8am
// run).
//
// For every appointment on tomorrow's PT date whose status is confirmed
// or completed (and not archived), send:
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

  // Reminders go out the *afternoon before* the appointment. Query
  // tomorrow's PT date so each appointment receives one reminder ~24h
  // ahead, leaving time for the client to call and cancel during
  // business hours.
  const targetDate = addDaysISOInLA(1);
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

  const { data: upcoming, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", targetDate)
    .in("status", ["confirmed", "completed"])
    .is("archived_at", null)
    .eq("reminder_sent", false);

  if (error) {
    logError("cron/reminders GET", error);
    return apiError("Failed to fetch appointments.", 500);
  }

  const rows = upcoming || [];
  if (rows.length === 0) {
    return apiSuccess({ date: targetDate, sent: 0, smsSent: 0, emailSent: 0, skipped: 0 });
  }

  // Mappings come first so we know exactly which service/stylist rows we
  // need — pulling the full services + stylists tables on every cron tick
  // wastes Supabase egress and only got worse as the catalog grew.
  type ApptRow = { id: string; service_id: string | null; stylist_id: string | null };
  const todaysAppts = rows as ApptRow[];
  const apptIds = todaysAppts.map((a) => a.id);
  type MappingRow = { appointment_id: string; service_id: string; sort_order: number };
  const { data: mappings } = await supabase
    .from("appointment_services")
    .select("appointment_id, service_id, sort_order")
    .in("appointment_id", apptIds)
    .order("sort_order", { ascending: true });

  const serviceIdsByAppt = new Map<string, string[]>();
  const referencedServiceIds = new Set<string>();
  for (const m of (mappings || []) as MappingRow[]) {
    const arr = serviceIdsByAppt.get(m.appointment_id) || [];
    arr.push(m.service_id);
    serviceIdsByAppt.set(m.appointment_id, arr);
    referencedServiceIds.add(m.service_id);
  }
  const referencedStylistIds = new Set<string>();
  for (const a of todaysAppts) {
    if (a.service_id) referencedServiceIds.add(a.service_id);
    if (a.stylist_id) referencedStylistIds.add(a.stylist_id);
  }

  type NamedRow = { id: string; name: string };
  const [{ data: allServices }, { data: allStylists }] = await Promise.all([
    referencedServiceIds.size > 0
      ? supabase.from("services").select("id, name").in("id", Array.from(referencedServiceIds))
      : Promise.resolve({ data: [] as NamedRow[] }),
    referencedStylistIds.size > 0
      ? supabase.from("stylists").select("id, name").in("id", Array.from(referencedStylistIds))
      : Promise.resolve({ data: [] as NamedRow[] }),
  ]);

  const serviceMap = new Map<string, string>(
    ((allServices || []) as NamedRow[]).map((s) => [s.id, s.name]),
  );
  const stylistMap = new Map<string, string>(
    ((allStylists || []) as NamedRow[]).map((s) => [s.id, s.name]),
  );

  let smsSent = 0, emailSent = 0, skipped = 0;

  type ReminderApptRow = ApptRow & {
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    sms_consent: boolean | null;
    cancel_token: string | null;
    date: string;
    start_time: string;
  };
  for (const appt of rows as ReminderApptRow[]) {
    const ids = serviceIdsByAppt.get(appt.id) || (appt.service_id ? [appt.service_id] : []);
    const serviceName = ids.map((id) => serviceMap.get(id)).filter(Boolean).join(", ") || "your appointment";
    const stylistName = (appt.stylist_id && stylistMap.get(appt.stylist_id)) || "your stylist";
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
          headline: `See you tomorrow at ${vars.time}`,
          preheader: `Reminder: ${vars.service} with ${vars.stylist} tomorrow at ${vars.time}.`,
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

  return apiSuccess({ date: targetDate, appointments: rows.length, smsSent, emailSent, skipped });
}
