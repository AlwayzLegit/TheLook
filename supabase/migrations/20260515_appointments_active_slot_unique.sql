-- Make double-booking the same slot a hard constraint at the database
-- level instead of relying on the application-side getAvailableSlots()
-- pre-check.
--
-- Today the booking handler (src/app/api/appointments/route.ts) does
-- SELECT-then-INSERT: it asks getAvailableSlots() if the slot is free,
-- then inserts a new pending row. Two clients tapping the same slot
-- inside the millisecond window between the SELECT and the INSERT can
-- both observe "free" and both succeed — leaving two pending requests
-- the salon then has to pick one of by hand.
--
-- A partial unique index on (stylist_id, date, start_time) where the
-- row isn't cancelled is the smallest, most boring fix: Postgres now
-- rejects the second insert with error 23505, the route translates
-- that to HTTP 409 (same message the pre-check already returns), and
-- the cancelled rows stay duplicable so a customer can re-book a
-- previously-cancelled slot at the same time.
--
-- Failure mode considered: if production already has duplicate non-
-- cancelled rows, the CREATE INDEX would error mid-migration with a
-- generic message. The DO block ahead surfaces a count instead so the
-- operator knows to clean up first.

do $$
declare
  dup_count integer;
begin
  select count(*) into dup_count from (
    select stylist_id, date, start_time
    from public.appointments
    where status <> 'cancelled'
    group by stylist_id, date, start_time
    having count(*) > 1
  ) t;
  if dup_count > 0 then
    raise exception
      'Cannot create appointments_active_slot_idx: % duplicate active slots exist. Resolve them in admin before re-running this migration.',
      dup_count;
  end if;
end $$;

create unique index if not exists appointments_active_slot_idx
  on public.appointments (stylist_id, date, start_time)
  where status <> 'cancelled';
