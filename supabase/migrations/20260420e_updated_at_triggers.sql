-- B-13 — single shared updated_at trigger function, attached to every
-- table that has an updated_at column. Eliminates the dozen one-off
-- BEFORE UPDATE triggers we'd otherwise need.
--
-- Idempotent: drops + recreates the trigger on each table.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM public;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_schema, c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name = 'updated_at'
       AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I.%I;',
      t.table_schema, t.table_name
    );
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t.table_schema, t.table_name
    );
  END LOOP;
END;
$$;
