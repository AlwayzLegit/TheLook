-- QA audit P3-6 — appointments.service_id is an unindexed FK. Supabase
-- flagged it as a potential slow-join when joining to services. Cheap
-- fix; CONCURRENTLY omitted because migrations run in a transaction and
-- Supabase's migration runner doesn't support non-transactional DDL.

CREATE INDEX IF NOT EXISTS idx_appointments_service_id
  ON public.appointments (service_id);
