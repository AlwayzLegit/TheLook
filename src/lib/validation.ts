import { z } from "zod";

export const appointmentCreateSchema = z.object({
  serviceId: z.string().uuid(),
  stylistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  turnstileToken: z.string().trim().optional(),
});

export const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional(),
  service: z.string().trim().max(120).optional(),
  message: z.string().trim().max(3000).optional(),
  turnstileToken: z.string().trim().optional(),
});

export const adminServiceSchema = z.object({
  category: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(255),
  price_text: z.string().trim().min(1).max(50),
  price_min: z.number().int().min(0).max(1_000_000),
  duration: z.number().int().min(1).max(600),
  image_url: z.string().trim().max(500).nullable().optional(),
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

