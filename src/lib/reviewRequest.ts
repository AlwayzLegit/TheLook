import { supabase } from "./supabase";
import { sendSMS } from "./sms";
import { sendRawEmail, brandedFromText } from "./email";
import { getSetting } from "./settings";
import { renderTemplate, DEFAULT_TEMPLATES } from "./templates";
import { logError } from "./apiResponse";

// Review-request send pipeline. Used in two places:
//   1. Manual fire from /admin/appointments → "Send review request"
//      action. Admin can edit the body before sending.
//   2. Auto-fire when an appointment status flips to "completed" and
//      review_request_sent_at is still null. Wired from the PATCH
//      /api/admin/appointments/[id] route.
//
// Returns whichever channels actually delivered. Both calls are
// dedup-safe via the review_request_sent_at column — callers can
// check it before calling, or just let this function bail when set.

export interface ReviewRequestOverrides {
  sms?: string;
  emailSubject?: string;
  emailBody?: string;
  channels?: { sms?: boolean; email?: boolean };
  // True when called from the auto-on-completion path so audit logs +
  // skip-if-already-sent behaviour can differ from the manual flow.
  // Manual sends are allowed to re-send (admin chose to); auto sends
  // bail when review_request_sent_at is non-null.
  trigger?: "manual" | "auto";
}

export interface ReviewRequestResult {
  ok: boolean;
  reason?: string;
  smsOk: boolean;
  emailOk: boolean;
  reviewUrl: string;
  alreadySent?: boolean;
}

export async function sendReviewRequest(
  appointmentId: string,
  overrides: ReviewRequestOverrides = {},
): Promise<ReviewRequestResult> {
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      "id, client_name, client_email, client_phone, sms_consent, service_id, stylist_id, status, review_request_sent_at",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptErr || !appt) {
    return { ok: false, reason: "appointment_not_found", smsOk: false, emailOk: false, reviewUrl: "" };
  }
  if (appt.status !== "completed") {
    return { ok: false, reason: "not_completed", smsOk: false, emailOk: false, reviewUrl: "" };
  }
  // Auto-trigger: skip if already sent. Manual: allow re-send (admin
  // chose to via the actions modal).
  if (overrides.trigger !== "manual" && appt.review_request_sent_at) {
    return {
      ok: false,
      reason: "already_sent",
      alreadySent: true,
      smsOk: false,
      emailOk: false,
      reviewUrl: "",
    };
  }

  const [{ data: stylist }, { data: mappings }] = await Promise.all([
    supabase.from("stylists").select("name").eq("id", appt.stylist_id).maybeSingle(),
    supabase
      .from("appointment_services")
      .select("service_id, sort_order")
      .eq("appointment_id", appointmentId)
      .order("sort_order", { ascending: true }),
  ]);
  const svcIds = (mappings || []).map((m: { service_id: string }) => m.service_id);
  const fallbackIds = svcIds.length ? svcIds : appt.service_id ? [appt.service_id] : [];
  const { data: services } = fallbackIds.length
    ? await supabase.from("services").select("id, name").in("id", fallbackIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries(((services as any[]) || []).map((s: any) => [s.id, s.name]));
  const serviceName =
    fallbackIds.map((sid: string) => serviceMap[sid]).filter(Boolean).join(", ") || "your appointment";

  const [smsTpl, emailSubjTpl, emailBodyTpl, reviewUrl] = await Promise.all([
    getSetting("review_request_sms_template").then((v) => v || DEFAULT_TEMPLATES.review_request_sms_template),
    getSetting("review_request_email_subject_template").then(
      (v) => v || DEFAULT_TEMPLATES.review_request_email_subject_template,
    ),
    getSetting("review_request_email_body_template").then(
      (v) => v || DEFAULT_TEMPLATES.review_request_email_body_template,
    ),
    getSetting("google_review_url").then(
      (v) => v || "https://www.google.com/search?q=the+look+hair+salon+glendale+reviews",
    ),
  ]);

  const vars = {
    client_name: appt.client_name || "there",
    service: serviceName,
    stylist: stylist?.name || "your stylist",
    salon_name: "The Look Hair Salon",
    review_url: reviewUrl,
  };

  const wantSms = overrides.channels?.sms ?? true;
  const wantEmail = overrides.channels?.email ?? true;
  const smsBody = overrides.sms || renderTemplate(smsTpl, vars);
  const emailSubject = overrides.emailSubject || renderTemplate(emailSubjTpl, vars);
  const emailBodyRendered = overrides.emailBody || renderTemplate(emailBodyTpl, vars);

  let smsOk = false;
  let emailOk = false;

  if (wantSms && appt.client_phone && appt.sms_consent === true) {
    smsOk = await sendSMS({
      to: appt.client_phone,
      event: "review.request",
      appointmentId,
      clientEmail: appt.client_email || null,
      body: smsBody,
    }).catch((e) => {
      logError("sendReviewRequest sms", e);
      return false;
    });
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
    }).catch((e) => {
      logError("sendReviewRequest email", e);
      return false;
    });
  }

  // Stamp the row regardless of channel success — second call to this
  // function (manual or auto) won't re-fire unless the operator passes
  // trigger:"manual". Keeps "auto" idempotent.
  await supabase
    .from("appointments")
    .update({ review_request_sent_at: new Date().toISOString() })
    .eq("id", appointmentId);

  return { ok: true, smsOk, emailOk, reviewUrl };
}
