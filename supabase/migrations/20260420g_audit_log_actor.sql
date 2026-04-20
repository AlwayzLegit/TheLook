-- B-17 — actor metadata on admin_log so every admin write is attributable.
-- Without these columns we can't tell which admin took an action, from
-- which IP, or with which user agent.
--
-- Idempotent. Backfills existing rows with the lone "system" placeholder
-- so non-null reads (analytics, exports) keep working.

ALTER TABLE public.admin_log
  ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_email   varchar(200),
  ADD COLUMN IF NOT EXISTS ip_address    varchar(64),
  ADD COLUMN IF NOT EXISTS user_agent    text;

-- Backfill: previously-logged rows have no actor recorded. Stamp them
-- with a sentinel so analytics queries that filter on actor_email still
-- see them as legitimate (just from before the actor columns existed).
UPDATE public.admin_log
   SET actor_email = COALESCE(actor_email, 'system@thelookhairsalonla.com')
 WHERE actor_email IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_log_actor_email
  ON public.admin_log(actor_email)
  WHERE actor_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_log_actor_user
  ON public.admin_log(actor_user_id)
  WHERE actor_user_id IS NOT NULL;
