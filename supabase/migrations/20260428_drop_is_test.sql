-- Removes the test-booking feature entirely. All UI affordances, API
-- filters, and cron skip-logic for is_test have been ripped out in
-- application code; this finishes the job at the schema level.
--
-- The owner committed to manually cleaning up any lingering is_test=true
-- rows beforehand, so we just drop the column outright. If any rows do
-- still exist they simply start counting in analytics normally — which
-- is the stated goal.

-- Drop the supporting index + column. `IF EXISTS` keeps re-runs safe.
DROP INDEX IF EXISTS idx_appointments_is_test;
ALTER TABLE appointments DROP COLUMN IF EXISTS is_test;
