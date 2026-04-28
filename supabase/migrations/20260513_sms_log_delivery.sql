-- SMS delivery status visibility.
--
-- The Twilio inbound webhook (/api/twilio/webhook) already understood
-- delivery status callbacks and updated sms_log.status when one came
-- in — but lib/sms.ts never told Twilio where to send those callbacks,
-- so the status field always reflected our own submission stage
-- ("sent" = Twilio accepted the request) and the audit trail couldn't
-- distinguish a real delivery from a carrier-blocked send.
--
-- Round-10 QA on a pending-A2P account caught this: every review-
-- request SMS appeared "sent" in admin_log even though the carrier
-- was blocking them at the gateway. This migration adds the columns
-- the webhook needs to stamp once Twilio's status callbacks start
-- flowing.

alter table public.sms_log
  add column if not exists delivered_at      timestamptz,
  add column if not exists last_status_at    timestamptz,
  add column if not exists provider_status   varchar(40);

-- Index for the new "show only undelivered" filter on /admin/activity.
create index if not exists idx_sms_log_provider_status
  on public.sms_log(provider_status);

comment on column public.sms_log.delivered_at is
  'Timestamp Twilio reported the carrier delivered the message to the handset. NULL until a status callback with status=delivered arrives.';
comment on column public.sms_log.last_status_at is
  'Timestamp of the most recent status update from Twilio (queued/sent/delivered/undelivered/failed). Lets ops see how stale the status is.';
comment on column public.sms_log.provider_status is
  'Raw Twilio MessageStatus string from the most recent callback. The status column above is our normalised value; this preserves Twilios native vocabulary (sending/sent/delivered/undelivered/failed/etc.).';
