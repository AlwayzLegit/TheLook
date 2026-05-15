import { z } from "zod";

// Lenient UUID check — Zod 4's .uuid() enforces RFC 4122 version + variant
// nibbles, which rejects our Any-Stylist sentinel 00000000-...-0001 (the
// version nibble is 0, which is invalid per RFC). Everywhere we used to
// call .uuid() we now accept any canonical 8-4-4-4-12 hex format — the
// values are still strictly formatted, just not version-restricted.
// Exported so non-zod call sites (like /api/availability, which parses
// CSV-style query strings of its own) can validate IDs against the same
// pattern without re-deriving the regex.
export const UUID_ISH = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuidish = () => z.string().regex(UUID_ISH, "Invalid id.");

export const appointmentCreateSchema = z.object({
  // Accept either a single serviceId (legacy) or an array serviceIds (multi-service).
  serviceId: uuidish().optional(),
  serviceIds: z.array(uuidish()).min(1).max(8).optional(),
  // Optional per-service variant ids, aligned by index with serviceIds.
  // Slot a "" (empty string) when a given service has no selected variant.
  variantIds: z.array(uuidish().or(z.literal(""))).max(8).optional(),
  stylistId: uuidish(),
  // Set when the customer chose "Any Stylist" — server then picks an available
  // stylist for the chosen date/time.
  anyStylist: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(200),
  // Phone is required for online bookings — staff need to reach the
  // client about same-day changes / running late / etc.
  clientPhone: z.string().trim().min(7, "Phone is required.").max(50),
  notes: z.string().trim().max(2000).optional(),
  // Required: customer must accept the no-show / 24h cancel / deposit policy.
  policyAccepted: z.boolean().refine((v) => v === true, {
    message: "You must accept the salon policy to book.",
  }),
  // Optional Stripe PaymentIntent id when a deposit was collected up-front.
  depositPaymentIntentId: z.string().trim().max(255).optional(),
  // A2P 10DLC — explicit SMS consent flag from the booking form.
  smsConsent: z.boolean().optional(),
  turnstileToken: z.string().trim().optional(),
}).refine((d) => !!d.serviceId || (d.serviceIds && d.serviceIds.length > 0), {
  message: "serviceId or serviceIds is required",
  path: ["serviceIds"],
});

export const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional(),
  service: z.string().trim().max(120).optional(),
  // Message is required — an empty contact is just inbox noise for the
  // salon with nothing actionable.
  message: z.string().trim().min(10, "Please include a short message.").max(3000),
  // A2P 10DLC — explicit SMS consent flag, persisted for audit purposes.
  smsConsent: z.boolean().optional(),
  turnstileToken: z.string().trim().optional(),
});

export const adminServiceSchema = z.object({
  category: z.string().trim().min(1).max(100),
  // Sub-grouping within a category. Today only Haircuts uses it
  // ("Women's" / "Men's") to split the homepage gallery — null is
  // valid for everything else and renders the un-split layout.
  subcategory: z.string().trim().max(60).nullable().optional(),
  name: z.string().trim().min(1).max(255),
  // Optional — server auto-generates from name when blank.
  slug: z.string().trim().max(160).nullable().optional(),
  price_text: z.string().trim().min(1).max(50),
  // Raised ceiling from $10k to $100k so high-end extensions + bridal
  // packages don't bounce.
  price_min: z.number().int().min(0).max(10_000_000),
  duration: z.number().int().min(1).max(600),
  // Long enough to hold signed Supabase Storage URLs (usually ~300-500
  // chars, occasionally more when the bucket nests). Too tight a limit
  // silently rejected admin edits and the owner saw "SAVE not working".
  image_url: z.string().trim().max(2000).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  products_used: z.string().max(4000).nullable().optional(),
  // Per-service framing copy. Owner-curated text shown on the public
  // detail page; falls back to the per-category default when blank.
  what_to_expect: z.string().max(4000).nullable().optional(),
  recommended_frequency: z.string().max(2000).nullable().optional(),
  pair_with: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
});

export const adminStylistSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().max(2000).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  specialties: z.union([z.array(z.string()), z.string()]).optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional().or(z.literal("")),
});

// Self-service schema for stylists editing their own profile.
// Excludes `active` and `sort_order` — those remain admin-only.
export const stylistSelfProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().max(2000).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  specialties: z.union([z.array(z.string()), z.string()]).optional(),
});

export const adminScheduleSchema = z.object({
  stylistId: z.string().uuid().optional().nullable(),
  ruleType: z.string().trim().min(1).max(20),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isClosed: z.boolean().optional(),
  note: z.string().max(255).optional().nullable(),
});

export const depositRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger_type: z.enum(["min_price_cents", "min_duration_minutes"]),
  trigger_value: z.number().int().min(0).max(10_000_000),
  deposit_cents: z.number().int().min(0).max(10_000_000),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
});

// Single line item on an appointment when the admin replaces the
// services list inline. Snapshotted price / duration override the
// services-table defaults so historical totals stay stable when an
// admin re-prices the underlying service later.
export const adminAppointmentServiceLineSchema = z.object({
  service_id: z.string().uuid(),
  // price_min stored in cents, matching appointment_services.price_min.
  price_min: z.number().int().min(0).max(10_000_000),
  duration: z.number().int().min(1).max(600),
  sort_order: z.number().int().min(0).max(100).optional(),
});

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export const adminAppointmentPatchSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  staff_notes: z.string().max(2000).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  // Reassign the stylist on a booking — used when "Any Stylist" was
  // chosen at booking time and a different stylist actually performed
  // the service, OR when the assigned stylist needs to be swapped due
  // to a schedule change.
  stylist_id: z.string().uuid().optional(),
  // When provided, replaces every appointment_services row for this
  // booking. Each entry carries the snapshotted price + duration the
  // admin wants on the row; absent → existing services stay untouched.
  services: z.array(adminAppointmentServiceLineSchema).min(1).max(20).optional(),
  // Correct a client's contact details on the booking (typo'd name,
  // wrong phone, or attaching a real email to a phone-only walk-in).
  // The PATCH route only honours client_email when the row currently
  // holds a synthetic @noemail placeholder — a real email is identity
  // and must be changed from the client profile, not an appointment.
  client_name: z.string().trim().min(1).max(200).optional(),
  client_phone: z.string().trim().max(50).nullable().optional(),
  client_email: z.string().trim().email().max(200).optional(),
});

// 32-hex cancel token issued by /api/appointments (crypto.randomUUID
// with hyphens stripped). Reused by cancel + reschedule routes.
export const cancelTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/i, "Invalid token.");

// Statuses where a customer-initiated reschedule is allowed. Whitelist
// instead of blacklist so an unexpected status (e.g. "no_show") can't
// slip past the gate.
export const RESCHEDULABLE_STATUSES = ["pending", "confirmed"] as const;

export const rescheduleSchema = z.object({
  token: cancelTokenSchema,
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
});

export const waitlistCreateSchema = z.object({
  serviceId: uuidish(),
  stylistId: uuidish().nullable().optional(),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(50).nullable().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  // Free-text — capped so a hostile client can't pad rows with
  // megabyte-sized strings.
  preferredTimeRange: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

// Discount-validate is read-only (no DB write, no money flow), but
// the route does math against the client-supplied servicePrice and
// echoes a "you saved $X" total back. Constrain the inputs so the
// response can't be manipulated into nonsensical numbers via NaN/-1.
export const discountValidateSchema = z.object({
  code: z.string().trim().min(1).max(60),
  servicePrice: z.number().int().min(0).max(10_000_000).optional().default(0),
});

// Money-in-cents bound: 100 = $1.00 minimum, 100_000_000 = $1,000,000
// ceiling. Anything outside that range is almost certainly a typo or
// an attempt to manipulate the deposit flow.
export const depositCreateSchema = z
  .object({
    appointmentId: uuidish().optional(),
    amountCents: z.number().int().finite().min(100).max(100_000_000),
    clientEmail: z.string().trim().email().max(200).optional(),
    clientName: z.string().trim().max(200).optional(),
    clientPhone: z.string().trim().max(50).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine((v) => !!v.appointmentId || !!v.clientEmail, {
    message: "appointmentId or clientEmail is required",
    path: ["clientEmail"],
  });

