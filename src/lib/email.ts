import { Resend } from "resend";
import { logger } from "./logger";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const SALON_EMAIL = process.env.ADMIN_EMAIL || "look_hairsalon@yahoo.com";

interface AppointmentDetails {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  cancelUrl?: string;
}

export interface EmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: unknown;
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

function escapeUrl(value: string): string {
  // URLs go into href="..." — escape quotes/<>/&. Reject anything that
  // isn't an http(s) URL so we never produce a javascript: href.
  if (!/^https?:\/\//i.test(value)) return "#";
  return escape(value);
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

async function send(
  topic: string,
  payload: { to: string; subject: string; html: string },
): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) {
    logger.warn("email skipped: RESEND_API_KEY not set", { topic, to: payload.to });
    return { ok: false, skipped: true };
  }
  try {
    await resend.emails.send({ from: FROM, ...payload });
    return { ok: true };
  } catch (error) {
    logger.error("email send failed", { topic, to: payload.to, error });
    return { ok: false, error };
  }
}

export async function sendBookingConfirmation(details: AppointmentDetails): Promise<EmailResult> {
  const clientName = escape(details.clientName);
  const serviceName = escape(details.serviceName);
  const stylistName = escape(details.stylistName);
  const dateText = escape(formatDate(details.date));
  const timeText = escape(formatTime(details.startTime));
  const cancelUrl = details.cancelUrl ? escapeUrl(details.cancelUrl) : null;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
        <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">BOOKING CONFIRMATION</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #eee;">
        <p style="color: #282936; margin: 0 0 20px;">Hi ${clientName},</p>
        <p style="color: #666; margin: 0 0 20px;">Your appointment has been booked! Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Service</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${serviceName}</td></tr>
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Stylist</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${stylistName}</td></tr>
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Date</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${dateText}</td></tr>
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Time</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${timeText}</td></tr>
        </table>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 13px; margin: 0;">919 South Central Ave Suite #E, Glendale, CA 91204</p>
          <p style="color: #666; font-size: 13px; margin: 4px 0;">(818) 662-5665</p>
        </div>
        ${cancelUrl ? `<div style="margin-top: 20px; text-align: center;"><a href="${cancelUrl}" style="color: #c2274b; font-size: 13px;">Need to cancel? Click here</a></div>` : ""}
      </div>
      <p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">
        Please note: A $50 deposit may be required for select color/styling services. 25% cancellation fee applies for no-shows or cancellations within 24 hours.
      </p>
    </div>
  `;

  const subject = `Booking Confirmed — ${formatDate(details.date)} at ${formatTime(details.startTime)}`;
  const clientResult = await send("booking_confirmation_client", {
    to: details.clientEmail,
    subject,
    html,
  });
  await send("booking_confirmation_salon", {
    to: SALON_EMAIL,
    subject: `New Booking: ${details.clientName} — ${details.serviceName} with ${details.stylistName}`,
    html: html.replace("BOOKING CONFIRMATION", "NEW BOOKING ALERT"),
  });
  return clientResult;
}

export async function sendCancellationEmail(
  details: Omit<AppointmentDetails, "cancelUrl">,
): Promise<EmailResult> {
  const clientName = escape(details.clientName);
  const serviceName = escape(details.serviceName);
  const dateText = escape(formatDate(details.date));
  const timeText = escape(formatTime(details.startTime));

  return send("cancellation_client", {
    to: details.clientEmail,
    subject: `Appointment Cancelled — ${formatDate(details.date)}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <p style="color: #282936;">Hi ${clientName},</p>
          <p style="color: #666;">Your appointment for <strong>${serviceName}</strong> on <strong>${dateText}</strong> at <strong>${timeText}</strong> has been cancelled.</p>
          <p style="color: #666;">We'd love to see you again! Call us at (818) 662-5665 or visit our website to rebook.</p>
        </div>
      </div>
    `,
  });
}

export async function sendReminderEmail(details: AppointmentDetails): Promise<EmailResult> {
  const clientName = escape(details.clientName);
  const serviceName = escape(details.serviceName);
  const stylistName = escape(details.stylistName);
  const dateText = escape(formatDate(details.date));
  const timeText = escape(formatTime(details.startTime));
  const cancelUrl = details.cancelUrl ? escapeUrl(details.cancelUrl) : null;

  return send("reminder_client", {
    to: details.clientEmail,
    subject: `Reminder: Your appointment tomorrow at ${formatTime(details.startTime)}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
          <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">APPOINTMENT REMINDER</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <p style="color: #282936;">Hi ${clientName},</p>
          <p style="color: #666;">Just a friendly reminder about your appointment tomorrow:</p>
          <p style="color: #282936; font-weight: bold; font-size: 16px; margin: 15px 0;">${serviceName} with ${stylistName}<br/>${dateText} at ${timeText}</p>
          <p style="color: #666; font-size: 13px;">919 South Central Ave Suite #E, Glendale, CA 91204</p>
          ${cancelUrl ? `<p style="margin-top: 15px;"><a href="${cancelUrl}" style="color: #c2274b; font-size: 13px;">Need to cancel or reschedule?</a></p>` : ""}
        </div>
      </div>
    `,
  });
}
