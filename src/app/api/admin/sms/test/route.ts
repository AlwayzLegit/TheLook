import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { sendAdminTestSMS } from "@/lib/sms";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Admin-only test SMS. Sends a single short message to the phone passed in
// the body, bypassing the global sms_enabled toggle (so admins can verify
// Twilio credentials even while SMS is globally off). Opt-out + logging
// still apply.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const phone = (body.phone || "").toString().trim();
  if (!phone) return apiError("phone is required.", 400);

  // Require Twilio env vars so we can return a clearer message than
  // the generic 'SMS send failed'.
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return apiError(
      "Twilio isn't configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Vercel env vars.",
      503,
    );
  }

  try {
    const ok = await sendAdminTestSMS(phone);
    await logAdminAction("sms.test", JSON.stringify({ phone, ok }));
    if (!ok) return apiError("Twilio rejected the message. Check the SMS log for the failure reason.", 502);
    return apiSuccess({ ok: true });
  } catch (err) {
    logError("admin/sms/test", err);
    return apiError(err instanceof Error ? err.message : "Test SMS failed.", 500);
  }
}
