-- Admin-editable SMS + email templates for the day-of reminder cron and
-- the manual "send review request" action on completed appointments.
--
-- Templates live in salon_settings alongside the other toggles so the
-- owner can tweak wording without a deploy. The code layer
-- (src/lib/templates.ts) provides defaults if a key is missing, so
-- running this migration is NOT required for reminders to work — it
-- just exposes the override rows to the admin Settings UI.
--
-- Also: google_review_url so the review-request flow has a target.
-- Placeholder is the search-URL the owner shared; replace with the
-- proper Google "write a review" URL once the Google Business Profile
-- page is handy.

INSERT INTO salon_settings (key, value, updated_at)
VALUES
  ('reminder_sms_template',
   'Hi {{client_name}}! Reminder: {{service}} with {{stylist}} today at {{time}} at The Look Hair Salon, 919 S Central Ave, Glendale. Reply STOP to opt out.',
   now()),
  ('reminder_email_subject_template',
   'Your appointment today at {{time}} — The Look Hair Salon',
   now()),
  ('reminder_email_body_template',
   'Hi {{client_name}},' || chr(10) || chr(10) ||
   'This is a friendly reminder about your appointment today:' || chr(10) || chr(10) ||
   '• {{service}}' || chr(10) || '• With {{stylist}}' || chr(10) || '• At {{time}}' || chr(10) || chr(10) ||
   'We''re at 919 S Central Ave, Suite E, Glendale, CA 91204.' || chr(10) || chr(10) ||
   'If you need to cancel or reschedule, please reply or call (818) 662-5665.' || chr(10) || chr(10) ||
   'See you soon!' || chr(10) || 'The Look Hair Salon',
   now()),
  ('review_request_sms_template',
   'Hi {{client_name}}! Thank you for visiting The Look today. If you have a minute, we''d love your feedback: {{review_url}} — Reply STOP to opt out.',
   now()),
  ('review_request_email_subject_template',
   'Thank you for visiting The Look Hair Salon',
   now()),
  ('review_request_email_body_template',
   'Hi {{client_name}},' || chr(10) || chr(10) ||
   'Thank you for coming in today for your {{service}} with {{stylist}}. We hope you love the result.' || chr(10) || chr(10) ||
   'If you have a moment, we''d really appreciate a quick review — it helps other people find us:' || chr(10) || chr(10) ||
   '{{review_url}}' || chr(10) || chr(10) ||
   'Thanks so much,' || chr(10) || 'The Look Hair Salon' || chr(10) || '(818) 662-5665',
   now()),
  ('google_review_url',
   'https://www.google.com/search?q=the+look+hair+salon+glendale+reviews',
   now())
ON CONFLICT (key) DO NOTHING;
