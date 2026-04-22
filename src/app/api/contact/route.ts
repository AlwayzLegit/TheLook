import { NextRequest } from "next/server";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactCreateSchema } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { RATE_LIMITS } from "@/lib/constants";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { sendStaffNewMessageEmail } from "@/lib/email";
import { getStaffNotificationEmails } from "@/lib/settings";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({
    key: `contact:${ip}`,
    limit: RATE_LIMITS.CONTACT.limit,
    windowMs: RATE_LIMITS.CONTACT.windowMs,
  });
  if (!rl.ok) {
    return apiError("Too many messages sent. Please wait a few minutes before trying again.", 429);
  }

  if (!hasSupabaseConfig) {
    return apiError("Contact backend is not configured. Please call us directly at (818) 662-5665.", 503);
  }

  const body = await request.json();
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid form data.", 400);
  }
  const { name, email, phone, service, message, smsConsent, turnstileToken } = parsed.data;

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return apiError(turnstile.error || "Captcha verification failed.", 400);
  }

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone,
    service,
    message,
    sms_consent: !!smsConsent,
    sms_consent_at: smsConsent ? new Date().toISOString() : null,
  });

  if (error) {
    logError("contact POST", error);
    return apiError("Failed to send message. Please try again.", 500);
  }

  // Fan out staff notifications. Non-blocking — the customer's submission
  // succeeds whether or not the email / bell notification lands.
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  const staffEmails = await getStaffNotificationEmails();
  sendStaffNewMessageEmail({
    recipients: staffEmails,
    name,
    email,
    phone: phone || null,
    service: service || null,
    message,
    adminUrl: `${baseUrl}/admin/messages`,
  }).catch((err) => logError("contact POST staff-email", err));

  createNotification({
    toAllAdmins: true,
    type: "message.new",
    title: `New message: ${name}`,
    body: (service ? `About ${service}. ` : "") + message.slice(0, 120),
    url: "/admin/messages",
  }).catch((err) => logError("contact POST admin-bell", err));

  return apiSuccess({ success: true });
}
