import { z } from "zod";

// Lenient UUID check — Zod 4's .uuid() enforces RFC 4122 version + variant
// nibbles, which rejects our Any-Stylist sentinel 00000000-...-0001 (the
// version nibble is 0, which is invalid per RFC). Everywhere we used to
// call .uuid() we now accept any canonical 8-4-4-4-12 hex format — the
// values are still strictly formatted, just not version-restricted.
const UUID_ISH = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
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
  // Optional Stripe SetupIntent id when a card was saved without a charge
  // (short appointments below the deposit threshold).
  setupIntentId: z.string().trim().max(255).optional(),
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
  turnstileToken: z.string().trim().optional(),
});

export const adminServiceSchema = z.object({
  category: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(255),
  // Optional — server auto-generates from name when blank.
  slug: z.string().trim().max(160).nullable().optional(),
  price_text: z.string().trim().min(1).max(50),
  price_min: z.number().int().min(0).max(1_000_000),
  duration: z.number().int().min(1).max(600),
  image_url: z.string().trim().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  products_used: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
});

export const adminStylistSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().max(2000).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  specialties: z.union([z.array(z.string()), z.string()]).optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
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

export const adminAppointmentPatchSchema = z.object({
  status: z.string().trim().min(1).max(20).optional(),
  staff_notes: z.string().max(2000).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

