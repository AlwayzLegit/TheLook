-- B-24 — backing indexes for foreign keys that don't already have one.
-- Without these, every DELETE/UPDATE on the referenced parent triggers a
-- sequential scan on the child table.
--
-- Idempotent (CREATE INDEX IF NOT EXISTS).

-- appointment_services
CREATE INDEX IF NOT EXISTS idx_appointment_services_service
  ON public.appointment_services(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_variant
  ON public.appointment_services(variant_id)
  WHERE variant_id IS NOT NULL;

-- stylist_services (composite is the natural key, single-col indexes still
-- help when filtering by either side)
CREATE INDEX IF NOT EXISTS idx_stylist_services_stylist
  ON public.stylist_services(stylist_id);
CREATE INDEX IF NOT EXISTS idx_stylist_services_service
  ON public.stylist_services(service_id);

-- schedule_rules
CREATE INDEX IF NOT EXISTS idx_schedule_rules_stylist
  ON public.schedule_rules(stylist_id)
  WHERE stylist_id IS NOT NULL;

-- waitlist
CREATE INDEX IF NOT EXISTS idx_waitlist_service
  ON public.waitlist(service_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_stylist
  ON public.waitlist(stylist_id)
  WHERE stylist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_status
  ON public.waitlist(status);

-- stylist_commissions
CREATE INDEX IF NOT EXISTS idx_stylist_commissions_stylist
  ON public.stylist_commissions(stylist_id);

-- deposits
CREATE INDEX IF NOT EXISTS idx_deposits_appointment
  ON public.deposits(appointment_id);

-- charges
CREATE INDEX IF NOT EXISTS idx_charges_appointment
  ON public.charges(appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_charges_client_email
  ON public.charges(client_email)
  WHERE client_email IS NOT NULL;

-- product_usage
CREATE INDEX IF NOT EXISTS idx_product_usage_appointment
  ON public.product_usage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_product_usage_product
  ON public.product_usage(product_id);

-- discount_usage
CREATE INDEX IF NOT EXISTS idx_discount_usage_discount
  ON public.discount_usage(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_appointment
  ON public.discount_usage(appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discount_usage_email
  ON public.discount_usage(client_email);

-- admin_log
CREATE INDEX IF NOT EXISTS idx_admin_log_appointment
  ON public.admin_log(appointment_id)
  WHERE appointment_id IS NOT NULL;

-- admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_stylist
  ON public.admin_users(stylist_id)
  WHERE stylist_id IS NOT NULL;

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_stylist
  ON public.notifications(recipient_stylist_id)
  WHERE recipient_stylist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_appointment
  ON public.notifications(appointment_id)
  WHERE appointment_id IS NOT NULL;

-- service_variants
CREATE INDEX IF NOT EXISTS idx_service_variants_service
  ON public.service_variants(service_id);

-- client_profiles
CREATE INDEX IF NOT EXISTS idx_client_profiles_preferred_stylist
  ON public.client_profiles(preferred_stylist_id)
  WHERE preferred_stylist_id IS NOT NULL;

-- client_photos
CREATE INDEX IF NOT EXISTS idx_client_photos_appointment
  ON public.client_photos(appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_photos_service
  ON public.client_photos(service_id)
  WHERE service_id IS NOT NULL;
