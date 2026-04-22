// Tiny mustache-style template renderer — `{{key}}` is replaced with
// the matching variable; unknown keys are left blank. Used for admin-
// editable SMS + email templates stored in salon_settings so the owner
// can rewrite the day-of reminder wording (and review request copy)
// without a deploy.
//
// Supported placeholders by caller convention (no strict validation):
//   client_name, service, stylist, date, time, salon_name,
//   cancel_url, review_url
//
// Keep additions small and documented — every new placeholder has to be
// fed in by every call site, otherwise it silently renders empty.

export type TemplateVars = Record<string, string | number | null | undefined>;

export function renderTemplate(tpl: string, vars: TemplateVars): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

export const DEFAULT_TEMPLATES = {
  reminder_sms_template:
    "Hi {{client_name}}! Reminder: {{service}} with {{stylist}} today at {{time}} at The Look Hair Salon, 919 S Central Ave, Glendale. Reply STOP to opt out.",
  reminder_email_subject_template:
    "Your appointment today at {{time}} — The Look Hair Salon",
  reminder_email_body_template:
    "Hi {{client_name}},\n\nThis is a friendly reminder about your appointment today:\n\n• {{service}}\n• With {{stylist}}\n• At {{time}}\n\nWe're at 919 S Central Ave, Suite E, Glendale, CA 91204.\n\nIf you need to cancel or reschedule, please reply to this email or call (818) 662-5665.{{cancel_url}}\n\nSee you soon!\nThe Look Hair Salon",
  review_request_sms_template:
    "Hi {{client_name}}! Thank you for visiting The Look today. If you have a minute, we'd love your feedback: {{review_url}} — Reply STOP to opt out.",
  review_request_email_subject_template:
    "Thank you for visiting The Look Hair Salon",
  review_request_email_body_template:
    "Hi {{client_name}},\n\nThank you for coming in today for your {{service}} with {{stylist}}. We hope you love the result.\n\nIf you have a moment, we'd really appreciate a quick review — it helps other people find us:\n\n{{review_url}}\n\nThanks so much,\nThe Look Hair Salon\n(818) 662-5665",
} as const;

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;
