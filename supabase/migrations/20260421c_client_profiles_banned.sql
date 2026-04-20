-- Import/export support for client_profiles.
--
-- Adds a `banned` flag + reason so imported blocklists carry through.
-- Adds `imported_at` so admins can tell which rows came from the CSV.

ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_client_profiles_banned
  ON public.client_profiles(banned)
  WHERE banned = true;
