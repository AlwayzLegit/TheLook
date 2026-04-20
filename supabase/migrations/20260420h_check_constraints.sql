-- B-12 — pin allowed values via CHECK constraints. We intentionally avoid
-- ENUM types here (migrations are fiddly), but CHECK gives us the same
-- "you can't accidentally write 'cancelld'" guarantee.
--
-- All idempotent: drop-then-create so re-runs are clean.

-- appointments.status
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending','confirmed','completed','cancelled','no_show'));

-- appointments.start_time < end_time (varchar HH:MM compares lexicographically
-- in 24h clock — same ordering).
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_time_order_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_time_order_check
  CHECK (start_time < end_time);

-- charges.type / status
ALTER TABLE public.charges
  DROP CONSTRAINT IF EXISTS charges_type_check;
ALTER TABLE public.charges
  ADD CONSTRAINT charges_type_check
  CHECK (type IN ('deposit','cancellation_fee','manual'));

ALTER TABLE public.charges
  DROP CONSTRAINT IF EXISTS charges_status_check;
ALTER TABLE public.charges
  ADD CONSTRAINT charges_status_check
  CHECK (status IN ('pending','succeeded','requires_action','failed','refunded'));

-- deposits.status (legacy table, still receives writes)
ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_status_check;
ALTER TABLE public.deposits
  ADD CONSTRAINT deposits_status_check
  CHECK (status IN ('pending','succeeded','refunded','failed'));

-- admin_users.role
ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin','stylist'));

-- schedule_rules.rule_type
ALTER TABLE public.schedule_rules
  DROP CONSTRAINT IF EXISTS schedule_rules_rule_type_check;
ALTER TABLE public.schedule_rules
  ADD CONSTRAINT schedule_rules_rule_type_check
  CHECK (rule_type IN ('weekly','override'));

-- discounts.type
ALTER TABLE public.discounts
  DROP CONSTRAINT IF EXISTS discounts_type_check;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_type_check
  CHECK (type IN ('percentage','fixed'));

-- waitlist.status
ALTER TABLE public.waitlist
  DROP CONSTRAINT IF EXISTS waitlist_status_check;
ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_status_check
  CHECK (status IN ('waiting','notified','booked','expired'));
