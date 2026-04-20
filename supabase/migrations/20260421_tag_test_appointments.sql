-- B-27 — tag existing test-data appointments so they stop showing up in
-- the live admin view. Run in the Supabase SQL editor.
--
-- Step 1: review what's marked as "obviously test". Only rows created
-- before launch + with emails that look like fake addresses. Adjust the
-- WHERE clause to match your actual test-data emails if different.

-- DRY RUN — inspect before you run the UPDATE:
--   SELECT id, client_name, client_email, date, created_at
--     FROM public.appointments
--    WHERE is_test = false
--      AND (
--        client_email ILIKE '%@example.%'
--        OR client_email ILIKE '%@test.%'
--        OR client_email ILIKE '%@mf.com'
--        OR client_email ILIKE '%@hh.com'
--        OR client_email ILIKE 'qa-%'
--        OR client_email ILIKE 'test%'
--        OR client_email ILIKE 'testing%'
--        OR client_email ILIKE '%@yopmail.%'
--        OR client_name ILIKE 'test%'
--        OR client_name ILIKE 'qa %'
--      )
--    ORDER BY created_at DESC;

-- Step 2: once you've confirmed the list is correct, run this:
UPDATE public.appointments
   SET is_test = true
 WHERE is_test = false
   AND (
     client_email ILIKE '%@example.%'
     OR client_email ILIKE '%@test.%'
     OR client_email ILIKE '%@mf.com'
     OR client_email ILIKE '%@hh.com'
     OR client_email ILIKE 'qa-%'
     OR client_email ILIKE 'test%'
     OR client_email ILIKE 'testing%'
     OR client_email ILIKE '%@yopmail.%'
     OR client_name ILIKE 'test%'
     OR client_name ILIKE 'qa %'
   );
