-- SMS infrastructure.
--
-- sms_log         — every outbound SMS attempt (body, to, from, status,
--                   provider message id, failure reason). Gives admins a
--                   single place to debug "did the client actually get the
--                   reminder?" and caps runaway spend by surfacing volume.
--
-- sms_optouts     — clients who replied STOP via the Twilio inbound
--                   webhook. Looked up before every outbound send; a
--                   match short-circuits.

CREATE TABLE IF NOT EXISTS public.sms_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone        varchar(32) NOT NULL,
  from_phone      varchar(32),
  body            text        NOT NULL,
  event           varchar(40) NOT NULL,    -- booking.confirm | booking.reminder | booking.status_change | booking.cancelled | admin.test | ...
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_email    varchar(200),
  status          varchar(20) NOT NULL DEFAULT 'queued', -- queued | sent | delivered | failed | undelivered
  provider_sid    varchar(64),            -- Twilio Message SID
  failure_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_to_phone ON public.sms_log(to_phone);
CREATE INDEX IF NOT EXISTS idx_sms_log_appointment ON public.sms_log(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_log_status ON public.sms_log(status);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON public.sms_log(created_at DESC);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_public ON public.sms_log;
CREATE POLICY deny_public ON public.sms_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.sms_optouts (
  to_phone    varchar(32) PRIMARY KEY,
  client_email varchar(200),
  reason       varchar(32) DEFAULT 'STOP',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_optouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_public ON public.sms_optouts;
CREATE POLICY deny_public ON public.sms_optouts FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Shared updated_at trigger (created in 20260420e). Attach only if the
-- function exists so this migration still runs on an isolated dev DB.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at' AND pronamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.sms_log;
    CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.sms_log
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
