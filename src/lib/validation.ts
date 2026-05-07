import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const RULE_TYPES = ["weekly", "override"] as const;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");
const uuid = z.string().uuid();

export const createAppointmentSchema = z.object({
  serviceId: uuid,
  stylistId: uuid,
  date: dateString,
  startTime: timeString,
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateAppointmentSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    staffNotes: z.string().max(5000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.staffNotes !== undefined, {
    message: "At least one of status or staffNotes is required",
  });

export const createScheduleRuleSchema = z
  .object({
    stylistId: uuid.nullable().optional(),
    ruleType: z.enum(RULE_TYPES),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    specificDate: dateString.nullable().optional(),
    startTime: timeString.nullable().optional(),
    endTime: timeString.nullable().optional(),
    isClosed: z.boolean().optional().default(false),
    note: z.string().max(255).nullable().optional(),
  })
  .refine(
    (v) => (v.ruleType === "weekly" ? v.dayOfWeek !== null && v.dayOfWeek !== undefined : true),
    { message: "weekly rules require dayOfWeek", path: ["dayOfWeek"] },
  )
  .refine(
    (v) => (v.ruleType === "override" ? !!v.specificDate : true),
    { message: "override rules require specificDate", path: ["specificDate"] },
  )
  .refine(
    (v) => (v.isClosed ? true : !!v.startTime && !!v.endTime),
    { message: "startTime and endTime are required unless isClosed", path: ["startTime"] },
  );

export const cancelTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/i, "Invalid cancel token");

export const availabilityQuerySchema = z.object({
  stylistId: uuid,
  serviceId: uuid,
  date: dateString,
});

export function badRequest(error: z.ZodError) {
  return {
    error: "Invalid request",
    issues: error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}
