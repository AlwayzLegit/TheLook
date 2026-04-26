import { NextRequest } from "next/server";
import { z } from "zod";
import { hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sendReviewRequest } from "@/lib/reviewRequest";

// Manual replacement for the retired review-requests cron. Admin fires
// this from the completed-appointment view, optionally overriding the
// pre-filled body first. SMS respects consent + opt-outs, email goes
// through Resend. Outcome is logged to sms_log (via sendSMS) + audit.
//
// Body is optional — omit to use the stored template. Implementation
// lives in lib/reviewRequest.ts so the auto-on-completion trigger in
// the PATCH route can share it.
const schema = z.object({
  sms: z.string().max(1600).optional(),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(5000).optional(),
  channels: z.object({ sms: z.boolean().optional(), email: z.boolean().optional() }).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(`${first.path.join(".")}: ${first.message}`, 400);
  }

  const result = await sendReviewRequest(id, {
    sms: parsed.data.sms,
    emailSubject: parsed.data.emailSubject,
    emailBody: parsed.data.emailBody,
    channels: parsed.data.channels,
    trigger: "manual",
  });

  if (!result.ok) {
    if (result.reason === "appointment_not_found") return apiError("Appointment not found.", 404);
    if (result.reason === "not_completed") {
      return apiError("Review requests only go to completed appointments.", 400);
    }
    if (result.reason === "cooldown_active") {
      const ageMin = result.lastSentAt
        ? Math.round((Date.now() - new Date(result.lastSentAt).getTime()) / 60000)
        : null;
      const ago = ageMin === null ? "recently" : `${ageMin} minute${ageMin === 1 ? "" : "s"} ago`;
      return apiError(
        `A review request was already sent ${ago}. Try again in 30 minutes if it didn't go through.`,
        429,
      );
    }
    return apiError("Failed to send review request.", 500);
  }

  await logAdminAction(
    "review_request.sent",
    JSON.stringify({
      appointmentId: id,
      smsOk: result.smsOk,
      emailOk: result.emailOk,
      channels: { sms: parsed.data.channels?.sms ?? true, email: parsed.data.channels?.email ?? true },
      trigger: "manual",
    }),
  );

  return apiSuccess({ smsOk: result.smsOk, emailOk: result.emailOk, reviewUrl: result.reviewUrl });
}
