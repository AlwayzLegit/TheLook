import { NextRequest } from "next/server";
import { z } from "zod";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sendSMS } from "@/lib/sms";
import { sendRawEmail, brandedFromText } from "@/lib/email";
import { getSetting } from "@/lib/settings";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";

// Manual replacement for the retired review-requests cron. Admin fires
// this from the completed-appointment view, optionally overriding the
// pre-filled body first. SMS respects consent + opt-outs, email goes
// through Resend. Outcome is logged to sms_log (via sendSMS) + audit.
//
// Body is optional — omit to use the stored template.
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

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id, client_name, client_email, client_phone, sms_consent, service_id, stylist_id, status, review_request_sent_at")
    .eq("id", id)
    .maybeSingle();
  if (apptErr || !appt) return apiError("Appointment not found.", 404);
  if (appt.status !== "completed") return apiError("Review requests only go to completed appointments.", 400);

  // Pull stylist + first service name for placeholder rendering.
  const [{ data: stylist }, { data: mappings }] = await Promise.all([
    supabase.from("stylists").select("name").eq("id", appt.stylist_id).maybeSingle(),
    supabase.from("appointment_services").select("service_id, sort_order").eq("appointment_id", id).order("sort_order", { ascending: true }),
  ]);
  const svcIds = (mappings || []).map((m: { service_id: string }) => m.service_id);
  const fallbackIds = svcIds.length ? svcIds : appt.service_id ? [appt.service_id] : [];
  const { data: services } = fallbackIds.length
    ? await supabase.from("services").select("id, name").in("id", fallbackIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries(((services as any[]) || []).map((s: any) => [s.id, s.name]));
  const serviceName = fallbackIds.map((sid: string) => serviceMap[sid]).filter(Boolean).join(", ") || "your appointment";

  const [smsTpl, emailSubjTpl, emailBodyTpl, reviewUrl] = await Promise.all([
    getSetting("review_request_sms_template").then((v) => v || DEFAULT_TEMPLATES.review_request_sms_template),
    getSetting("review_request_email_subject_template").then((v) => v || DEFAULT_TEMPLATES.review_request_email_subject_template),
    getSetting("review_request_email_body_template").then((v) => v || DEFAULT_TEMPLATES.review_request_email_body_template),
    getSetting("google_review_url").then((v) => v || "https://www.google.com/search?q=the+look+hair+salon+glendale+reviews"),
  ]);

  const vars = {
    client_name: appt.client_name || "there",
    service: serviceName,
    stylist: stylist?.name || "your stylist",
    salon_name: "The Look Hair Salon",
    review_url: reviewUrl,
  };

  const wantSms = parsed.data.channels?.sms ?? true;
  const wantEmail = parsed.data.channels?.email ?? true;
  const smsBody = parsed.data.sms || renderTemplate(smsTpl, vars);
  const emailSubject = parsed.data.emailSubject || renderTemplate(emailSubjTpl, vars);
  const emailBodyRendered = parsed.data.emailBody || renderTemplate(emailBodyTpl, vars);

  let smsOk = false;
  let emailOk = false;

  if (wantSms && appt.client_phone && appt.sms_consent === true) {
    smsOk = await sendSMS({
      to: appt.client_phone,
      event: "review.request",
      appointmentId: id,
      clientEmail: appt.client_email || null,
      body: smsBody,
    }).catch((e) => { logError("send-review-request sms", e); return false; });
  }

  if (wantEmail && appt.client_email) {
    emailOk = await sendRawEmail({
      to: appt.client_email,
      subject: emailSubject,
      text: emailBodyRendered,
      html: brandedFromText({
        kicker: "Thanks for visiting",
        headline: `We'd love your feedback, ${vars.client_name.split(" ")[0] || "friend"}`,
        preheader: `Leave a review for ${vars.service} with ${vars.stylist}`,
        text: emailBodyRendered,
        ctaLabel: "Leave a review",
        ctaUrl: reviewUrl,
      }),
    }).catch((e) => { logError("send-review-request email", e); return false; });
  }

  await supabase.from("appointments").update({ review_request_sent_at: new Date().toISOString() }).eq("id", id);

  await logAdminAction(
    "review_request.sent",
    JSON.stringify({ appointmentId: id, smsOk, emailOk, channels: { sms: wantSms, email: wantEmail } }),
  );

  return apiSuccess({ smsOk, emailOk, reviewUrl });
}
