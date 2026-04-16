import twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required in production"
      );
    }
    return null;
  }
  return twilio(accountSid, authToken);
}

const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER || "";

export const hasTwilioConfig = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
);

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface SmsAppointmentDetails {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  cancelUrl?: string;
}

async function sendSms(to: string, body: string) {
  const client = getTwilioClient();
  if (!client) {
    console.log("[SMS] Twilio not configured, skipping SMS to", to);
    return;
  }
  if (!FROM_PHONE) {
    console.log("[SMS] TWILIO_PHONE_NUMBER not set, skipping SMS");
    return;
  }

  try {
    const message = await client.messages.create({
      body,
      from: FROM_PHONE,
      to,
    });
    console.log("[SMS] Sent:", message.sid);
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
  }
}

export async function sendBookingConfirmationSms(
  details: SmsAppointmentDetails
) {
  const { clientName, clientPhone, serviceName, stylistName, date, startTime } =
    details;

  const body =
    `Hi ${clientName}! Your appointment at The Look Hair Salon is confirmed.\n\n` +
    `${serviceName} with ${stylistName}\n` +
    `${formatDate(date)} at ${formatTime(startTime)}\n` +
    `919 S Central Ave Suite #E, Glendale, CA 91204\n\n` +
    `Questions? Call (818) 662-5665`;

  await sendSms(clientPhone, body);
}

export async function sendCancellationSms(
  details: Omit<SmsAppointmentDetails, "cancelUrl">
) {
  const { clientName, clientPhone, serviceName, date, startTime } = details;

  const body =
    `Hi ${clientName}, your ${serviceName} appointment on ${formatDate(date)} at ${formatTime(startTime)} has been cancelled.\n\n` +
    `To rebook, call (818) 662-5665 or visit our website.`;

  await sendSms(clientPhone, body);
}

export async function sendReminderSms(details: SmsAppointmentDetails) {
  const { clientName, clientPhone, serviceName, stylistName, date, startTime, cancelUrl } =
    details;

  let body =
    `Hi ${clientName}! Reminder: ${serviceName} with ${stylistName} tomorrow at ${formatTime(startTime)}.\n` +
    `The Look Hair Salon — 919 S Central Ave Suite #E, Glendale, CA 91204`;

  if (cancelUrl) {
    body += `\n\nNeed to cancel? ${cancelUrl}`;
  }

  await sendSms(clientPhone, body);
}

export async function sendStatusChangeSms(details: {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  startTime: string;
  newStatus: string;
}) {
  const { clientName, clientPhone, serviceName, date, startTime, newStatus } =
    details;

  const messages: Record<string, string> = {
    confirmed: `Hi ${clientName}! Your ${serviceName} appointment on ${formatDate(date)} at ${formatTime(startTime)} is confirmed. See you at The Look Hair Salon!`,
    cancelled: `Hi ${clientName}, your ${serviceName} appointment on ${formatDate(date)} has been cancelled. Call (818) 662-5665 to rebook.`,
    completed: `Thank you for visiting The Look Hair Salon, ${clientName}! We hope you love your new look. See you next time!`,
    no_show: `Hi ${clientName}, we missed you today at The Look Hair Salon. Call (818) 662-5665 to reschedule your ${serviceName} appointment.`,
  };

  const body = messages[newStatus];
  if (!body) return;

  await sendSms(clientPhone, body);
}
