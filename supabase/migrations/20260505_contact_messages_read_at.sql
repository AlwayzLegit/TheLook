-- Track when admins read contact-form messages so the dashboard's
-- "Needs attention" counter can be accurate instead of growing
-- monotonically for the life of the salon.
--
-- Messages existing before this migration keep read_at NULL — they'll
-- show up in the unread count until someone opens them once. That's
-- the desired behaviour; existing messages ARE unread from a
-- not-yet-acknowledged perspective.

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Narrow partial index for the dashboard's "unread" query so it stays
-- fast as the total message count grows.
CREATE INDEX IF NOT EXISTS idx_contact_messages_unread
  ON public.contact_messages (created_at DESC)
  WHERE read_at IS NULL;
