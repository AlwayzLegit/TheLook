-- ============================================================================
-- Add variant_id to appointment_services so multi-area services like
-- Facial Hair Removal can record exactly which variant the client picked.
-- Idempotent: re-runs are safe.
-- ============================================================================

ALTER TABLE appointment_services
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES service_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_services_variant
  ON appointment_services(variant_id);
