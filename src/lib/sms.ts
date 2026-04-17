/**
 * SMS notifications via Twilio.
 * Falls back to no-op if Twilio env vars aren't configured.
 */

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    // Twilio not configured — silently skip
    return false;
  }

  if (!to) return false;

  try {
    // Dynamic import so twilio isn't loaded at module init (keeps edge runtime clean)
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);

    // Normalize phone number to E.164 (+1 for US if not present)
    let normalized = to.replace(/[^\d+]/g, "");
    if (!normalized.startsWith("+")) {
      if (normalized.length === 10) normalized = "+1" + normalized;
      else if (normalized.length === 11 && normalized.startsWith("1")) normalized = "+" + normalized;
      else normalized = "+" + normalized;
    }

    await client.messages.create({ body: message, from, to: normalized });
    return true;
  } catch (err) {
    console.error("SMS send failed:", err);
    return false;
  }
}

export async function sendBookingConfirmationSMS(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  time: string
) {
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const msg = `Hi ${clientName}! Your ${serviceName} at The Look is confirmed for ${formattedDate} at ${time}. Reply STOP to opt out. Call (818) 662-5665 for questions.`;
  return sendSMS(phone, msg);
}

export async function sendReminderSMS(
  phone: string,
  clientName: string,
  time: string
) {
  const msg = `Hi ${clientName}! Reminder: your appointment at The Look is tomorrow at ${time}. See you then! — 919 S Central Ave, Glendale`;
  return sendSMS(phone, msg);
}
