/**
 * SMS notifications via Twilio.
 *
 * Every send:
 *   1. Normalises to E.164 (+1 default for 10-digit US numbers).
 *   2. Short-circuits if the recipient is in sms_optouts.
 *   3. Respects admin-level enable toggles (settings.sms_enabled +
 *      per-event booleans). When the toggle is off we still write a
 *      'skipped' row to sms_log so admins can see coverage.
 *   4. Inserts a sms_log row on success/failure for auditability.
 */

import { hasSupabaseConfig, supabase } from "./supabase";
import { getSetting } from "./settings";

export type SMSEvent =
  | "booking.confirm"
  | "booking.reminder"
  | "booking.status_change"
  | "booking.cancelled"
  | "booking.reschedule"
  | "staff.new_booking"
  | "admin.test";

export interface SendSMSArgs {
  to: string;
  body: string;
  event: SMSEvent;
  appointmentId?: string | null;
  clientEmail?: string | null;
}

function e164(to: string): string | null {
  if (!to) return null;
  let n = to.replace(/[^\d+]/g, "");
  if (!n.startsWith("+")) {
    if (n.length === 10) n = "+1" + n;
    else if (n.length === 11 && n.startsWith("1")) n = "+" + n;
    else n = "+" + n;
  }
  // Valid E.164 is + followed by 8..15 digits.
  if (!/^\+\d{8,15}$/.test(n)) return null;
  return n;
}

async function isOptedOut(phone: string): Promise<boolean> {
  if (!hasSupabaseConfig) return false;
  try {
    const { data } = await supabase
      .from("sms_optouts")
      .select("to_phone")
      .eq("to_phone", phone)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Map SMSEvent → per-event settings key. Keeps the string-manipulation
// version type-safe.
const EVENT_SETTING_KEY: Record<SMSEvent, import("./settings").SettingsKey | null> = {
  "booking.confirm":       "sms_booking_confirm_enabled",
  "booking.reminder":      "sms_booking_reminder_enabled",
  "booking.status_change": "sms_booking_status_change_enabled",
  "booking.cancelled":     "sms_booking_cancelled_enabled",
  "booking.reschedule":    "sms_booking_reschedule_enabled",
  "staff.new_booking":     "sms_staff_new_booking_enabled",
  "admin.test":            null, // always allowed
};

async function eventAllowed(event: SMSEvent): Promise<boolean> {
  // Global kill-switch + per-event toggles, stored in salon_settings.
  // Default when unset = ON, so a new install works immediately.
  if (event !== "admin.test") {
    const globalSetting = await getSetting("sms_enabled").catch(() => null);
    if (globalSetting !== null && /^(false|0|off)$/i.test(String(globalSetting))) return false;
  }
  const key = EVENT_SETTING_KEY[event];
  if (!key) return true;
  const perEvent = await getSetting(key).catch(() => null);
  if (perEvent !== null && /^(false|0|off)$/i.test(String(perEvent))) return false;
  return true;
}

async function logOutbound(args: {
  to: string;
  from: string | null;
  body: string;
  event: SMSEvent;
  appointmentId?: string | null;
  clientEmail?: string | null;
  status: "queued" | "sent" | "skipped" | "failed";
  providerSid?: string | null;
  failureReason?: string | null;
}) {
  if (!hasSupabaseConfig) return;
  try {
    await supabase.from("sms_log").insert({
      to_phone: args.to,
      from_phone: args.from,
      body: args.body,
      event: args.event,
      appointment_id: args.appointmentId || null,
      client_email: args.clientEmail || null,
      status: args.status,
      provider_sid: args.providerSid || null,
      failure_reason: args.failureReason || null,
    });
  } catch (err) {
    console.error("sms_log insert failed:", err);
  }
}

// Primary send. Returns true when Twilio accepted the message.
export async function sendSMS(args: SendSMSArgs): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER || null;

  if (!accountSid || !authToken || !from) return false;

  const to = e164(args.to);
  if (!to) {
    await logOutbound({ ...args, from, to: args.to, status: "failed", failureReason: "Invalid phone number" });
    return false;
  }

  if (!(await eventAllowed(args.event))) {
    await logOutbound({ ...args, from, to, status: "skipped", failureReason: `event ${args.event} disabled` });
    return false;
  }

  if (await isOptedOut(to)) {
    await logOutbound({ ...args, from, to, status: "skipped", failureReason: "recipient opted out" });
    return false;
  }

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({ body: args.body, from, to });
    await logOutbound({
      ...args, to, from,
      status: msg.status === "failed" || msg.status === "undelivered" ? "failed" : "sent",
      providerSid: msg.sid,
    });
    return true;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await logOutbound({ ...args, from, to, status: "failed", failureReason: reason });
    console.error("SMS send failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────
//  Templated senders. Keep message bodies < 160 chars when possible so
//  Twilio bills them as single segments.
// ────────────────────────────────────────────────────────────────────────

function shortDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pretty12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function sendBookingConfirmationSMS(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  appointmentId?: string,
  clientEmail?: string,
) {
  return sendSMS({
    to: phone,
    event: "booking.confirm",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}! Your ${serviceName} at The Look is confirmed for ${shortDate(date)} at ${pretty12h(time)}. Reply STOP to opt out.`,
  });
}

export function sendReminderSMS(
  phone: string,
  clientName: string,
  time: string,
  appointmentId?: string,
  clientEmail?: string,
) {
  return sendSMS({
    to: phone,
    event: "booking.reminder",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}! Reminder: your appointment at The Look is tomorrow at ${pretty12h(time)}. 919 S Central Ave, Glendale. Reply STOP to opt out.`,
  });
}

export function sendStatusChangeSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  newStatus: string;
  appointmentId?: string;
  clientEmail?: string;
}) {
  const { phone, clientName, serviceName, date, time, newStatus, appointmentId, clientEmail } = args;
  let body: string;
  switch (newStatus) {
    case "confirmed":
      body = `Hi ${clientName}, your ${serviceName} at The Look on ${shortDate(date)} at ${pretty12h(time)} is confirmed. See you then!`;
      break;
    case "cancelled":
      body = `Hi ${clientName}, your ${serviceName} at The Look on ${shortDate(date)} has been cancelled. Call (818) 662-5665 to rebook.`;
      break;
    case "completed":
      body = `Thanks for visiting The Look, ${clientName}! We hope you loved your ${serviceName}. Leave us a review when you get a chance 💛`;
      break;
    case "no_show":
      body = `Hi ${clientName}, we missed you at The Look today. Call (818) 662-5665 to reschedule.`;
      break;
    default:
      return Promise.resolve(false);
  }
  return sendSMS({
    to: phone,
    event: "booking.status_change",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body,
  });
}

export function sendCancellationSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  appointmentId?: string;
  clientEmail?: string;
}) {
  const { phone, clientName, serviceName, date, time, appointmentId, clientEmail } = args;
  return sendSMS({
    to: phone,
    event: "booking.cancelled",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}, your ${serviceName} on ${shortDate(date)} at ${pretty12h(time)} at The Look has been cancelled. Call (818) 662-5665 to rebook.`,
  });
}

export function sendRescheduleSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  appointmentId?: string;
  clientEmail?: string;
}) {
  const { phone, clientName, serviceName, date, time, appointmentId, clientEmail } = args;
  return sendSMS({
    to: phone,
    event: "booking.reschedule",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}, your ${serviceName} at The Look has been rescheduled to ${shortDate(date)} at ${pretty12h(time)}.`,
  });
}

export function sendStaffNewBookingSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  appointmentId?: string;
}) {
  const { phone, clientName, serviceName, date, time, appointmentId } = args;
  return sendSMS({
    to: phone,
    event: "staff.new_booking",
    appointmentId: appointmentId || null,
    body: `[The Look] New booking: ${clientName} · ${serviceName} · ${shortDate(date)} ${pretty12h(time)}`,
  });
}

export function sendAdminTestSMS(phone: string) {
  return sendSMS({
    to: phone,
    event: "admin.test",
    body: "[The Look] Test SMS — if you can read this, Twilio is configured correctly.",
  });
}
