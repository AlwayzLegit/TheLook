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
import { getBranding } from "./branding";

export type SMSEvent =
  | "booking.confirm"
  | "booking.reminder"
  | "booking.status_change"
  | "booking.cancelled"
  | "booking.reschedule"
  | "staff.new_booking"
  | "review.request"
  | "admin.test"
  | "broadcast";

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
  "review.request":        "sms_review_request_enabled",
  "admin.test":            null, // always allowed
  "broadcast":             null, // admin-initiated one-off blasts, no gate
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

  // Bounded retry with exponential backoff for transient network
  // failures (socket hang up, ECONNRESET, 5xx from Twilio, etc). We
  // already logged + retried the failure once today (QA 2026-04-22
  // P2-#1) so the retry must log every attempt with a distinct
  // failure_reason for forensics.
  const { default: twilio } = await import("twilio");
  const client = twilio(accountSid, authToken);
  const attemptDelays = [0, 400, 1200]; // ~0ms, ~0.4s, ~1.2s — 3 attempts total
  let lastErr: unknown = null;

  // Tell Twilio where to POST delivery status updates. Round-11 fix:
  // before this, we recorded only the submission status ("sent" =
  // Twilio accepted the request), which made carrier-blocked
  // messages indistinguishable from delivered ones in admin_log.
  // The /api/twilio/webhook route already handles incoming status
  // callbacks (it just wasn't being told to send them). Skip the
  // callback URL when NEXTAUTH_URL is missing so local dev still
  // works without a public host.
  const baseUrl = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const statusCallback = baseUrl ? `${baseUrl}/api/twilio/webhook` : undefined;

  for (let i = 0; i < attemptDelays.length; i++) {
    if (attemptDelays[i] > 0) await new Promise((r) => setTimeout(r, attemptDelays[i]));
    try {
      const msg = await client.messages.create({
        body: args.body,
        from,
        to,
        ...(statusCallback ? { statusCallback } : {}),
      });
      await logOutbound({
        ...args, to, from,
        status: msg.status === "failed" || msg.status === "undelivered" ? "failed" : "sent",
        providerSid: msg.sid,
      });
      return true;
    } catch (err) {
      lastErr = err;
      const reason = err instanceof Error ? err.message : String(err);
      // Retry on plainly-transient conditions; treat anything else as
      // a permanent failure (invalid number, unverified trial dest, etc.)
      // and bail early so we don't waste attempts. Round-15 P2 added
      // /timeout/ — Twilio's HTTP client surfaces request timeouts as
      // "timeout of 30000ms exceeded", which doesn't match any of the
      // node-level patterns above; the first reschedule SMS attempt
      // failed with that exact message and got swallowed instead of
      // retried.
      const transient = /hang up|ECONN|ETIMEDOUT|timeout|network|socket|503|504|rate/i.test(reason);
      if (!transient || i === attemptDelays.length - 1) {
        await logOutbound({ ...args, from, to, status: "failed", failureReason: reason });
        console.error("SMS send failed:", err);
        return false;
      }
      console.warn(`SMS send transient error (attempt ${i + 1}): ${reason} — retrying`);
    }
  }

  // Unreachable in practice; included to satisfy the type checker.
  console.error("SMS send exhausted retries:", lastErr);
  return false;
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

// SMS sender name. Owner asked for the full salon name in every
// booking-related message (originally we shortened "The Look Hair
// Salon" → "The Look" to save characters; the trade-off was one
// extra Twilio segment per send vs brand-name fidelity, and the
// owner picked fidelity). The hard cap at 60 chars stops a wildly
// long DB-side override from blowing the segment budget — short of
// that we use whatever brand.name says.
function smsSenderName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 60 ? trimmed.slice(0, 60).trim() : trimmed;
}

// Trim the salon address to "street, city" so it stays clickable
// (iOS / Android SMS clients linkify a "123 Main St, Glendale CA"
// pattern as a directions tap) without spilling SMS into a third
// segment when combined with phone + service name. Stylists +
// QA confirmed in round-15 chat that just street + city is what
// customers actually want for click-to-directions.
function smsShortAddress(addr: string): string {
  const parts = (addr || "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.slice(0, 2).join(", ");
}

export async function sendBookingConfirmationSMS(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  appointmentId?: string,
  clientEmail?: string,
) {
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  const shortAddr = smsShortAddress(brand.address);
  // Round-15: customer reported the booking-confirm SMS used to
  // say "is confirmed for…" the moment they submitted, even
  // though every public booking lands as status='pending' until
  // an admin reviews it. New wording makes it explicit that
  // we've received the request and the real confirmation lands
  // in a separate text. Salon name + address + phone are
  // included so the customer can click-call or click-directions
  // straight from the message.
  return sendSMS({
    to: phone,
    event: "booking.confirm",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}! ${shortName} got your ${serviceName} request for ${shortDate(date)} at ${pretty12h(time)}. We'll text once it's confirmed. ${shortAddr} · ${brand.phone}. Reply STOP to opt out.`,
  });
}

export async function sendReminderSMS(
  phone: string,
  clientName: string,
  time: string,
  appointmentId?: string,
  clientEmail?: string,
) {
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  // Shorten the address for the SMS — drop the "Suite #…" / ZIP tail so
  // we fit in a single 160-char segment. Owner can override by saving a
  // cleaner brand_address.
  const shortAddr = brand.address.split(",").slice(0, 2).join(",").trim();
  return sendSMS({
    to: phone,
    event: "booking.reminder",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}! Reminder: your appointment at ${shortName} is tomorrow at ${pretty12h(time)}. ${shortAddr}. Reply STOP to opt out.`,
  });
}

export async function sendStatusChangeSMS(args: {
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
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  const shortAddr = smsShortAddress(brand.address);
  let body: string;
  // Round-15: distinct CONFIRMED wording so the post-admin-approval
  // SMS reads differently from the booking-received SMS the
  // customer got at submission time. Address + phone in every
  // booking-related message so the customer can click-call /
  // click-directions without leaving the SMS thread.
  switch (newStatus) {
    case "confirmed":
      body = `${shortName}: Your ${serviceName} on ${shortDate(date)} at ${pretty12h(time)} is now CONFIRMED. See you then! ${shortAddr} · ${brand.phone}`;
      break;
    case "cancelled":
      body = `Hi ${clientName}, your ${serviceName} at ${shortName} on ${shortDate(date)} at ${pretty12h(time)} has been cancelled. Call ${brand.phone} to rebook.`;
      break;
    case "completed":
      body = `Thanks for visiting ${shortName}, ${clientName}! We hope you loved your ${serviceName}. Leave us a review when you get a chance 💛`;
      break;
    case "no_show":
      body = `Hi ${clientName}, we missed you at ${shortName} today. Call ${brand.phone} to reschedule.`;
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

export async function sendCancellationSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  appointmentId?: string;
  clientEmail?: string;
}) {
  const { phone, clientName, serviceName, date, time, appointmentId, clientEmail } = args;
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  return sendSMS({
    to: phone,
    event: "booking.cancelled",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `Hi ${clientName}, your ${serviceName} on ${shortDate(date)} at ${pretty12h(time)} at ${shortName} has been cancelled. Call ${brand.phone} to rebook.`,
  });
}

export async function sendRescheduleSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  appointmentId?: string;
  clientEmail?: string;
}) {
  // Round-15 wording opens with the salon name (e.g. "The Look:")
  // rather than "Hi {clientName}" because the customer already
  // knows it's about their booking from the salon name; saves
  // characters and keeps the message in a single SMS segment.
  const { phone, serviceName, date, time, appointmentId, clientEmail } = args;
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  const shortAddr = smsShortAddress(brand.address);
  // Round-15 broadens the use of this event to any admin-side
  // change (date / start time / stylist / services list) on a
  // confirmed appointment, not just date+time edits. Wording
  // says "updated" rather than "rescheduled" so it works in
  // both the literal-reschedule and stylist-swap cases.
  return sendSMS({
    to: phone,
    event: "booking.reschedule",
    appointmentId: appointmentId || null,
    clientEmail: clientEmail || null,
    body: `${shortName}: Your ${serviceName} appointment was updated. New details: ${shortDate(date)} at ${pretty12h(time)}. ${shortAddr} · ${brand.phone}. Reply STOP to opt out.`,
  });
}

export async function sendStaffNewBookingSMS(args: {
  phone: string;
  clientName: string;
  serviceName: string;
  // The stylist the booking landed under (auto-assigned when the
  // customer picked Any, otherwise the one they requested).
  stylistName: string;
  // True when the customer explicitly picked this stylist; false
  // when they picked "Any" and the system auto-assigned. Surfaced
  // as a "(requested)" / "(any)" suffix so the salon's morning
  // text stream tells front-desk at a glance whether a swap is OK.
  requestedStylist: boolean;
  date: string;
  time: string;
  appointmentId?: string;
}) {
  const { phone, clientName, serviceName, stylistName, requestedStylist, date, time, appointmentId } = args;
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  const stylistTag = `${stylistName} (${requestedStylist ? "requested" : "any"})`;
  return sendSMS({
    to: phone,
    event: "staff.new_booking",
    appointmentId: appointmentId || null,
    body: `[${shortName}] New booking: ${clientName} · ${serviceName} · w/ ${stylistTag} · ${shortDate(date)} ${pretty12h(time)}`,
  });
}

export async function sendAdminTestSMS(phone: string) {
  const brand = await getBranding();
  const shortName = smsSenderName(brand.name);
  return sendSMS({
    to: phone,
    event: "admin.test",
    body: `[${shortName}] Test SMS — if you can read this, Twilio is configured correctly.`,
  });
}
