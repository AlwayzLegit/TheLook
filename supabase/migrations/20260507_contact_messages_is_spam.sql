-- Manual spam flag on contact messages.
--
-- Three-state nullable column:
--   NULL  — unflagged; client-side heuristic decides the Inbox / Spam split
--   TRUE  — admin manually marked spam (stays in Spam tab regardless of heuristic)
--   FALSE — admin marked "not spam" (stays in Inbox regardless of heuristic)
--
-- Lets the owner correct false positives + flag borderline messages the
-- heuristic missed. Index helps future filters if we ever need to query
-- by flag directly.

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS is_spam boolean;

CREATE INDEX IF NOT EXISTS idx_contact_messages_is_spam
  ON public.contact_messages (is_spam) WHERE is_spam IS NOT NULL;
