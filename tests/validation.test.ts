import { describe, it, expect } from "vitest";
import {
  appointmentCreateSchema,
  contactCreateSchema,
  adminServiceSchema,
  adminStylistSchema,
  adminScheduleSchema,
  adminAppointmentPatchSchema,
} from "@/lib/validation";

// Helper: valid UUID
const UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("appointmentCreateSchema", () => {
  const valid = {
    serviceId: UUID,
    stylistId: UUID,
    date: "2025-06-15",
    startTime: "10:00",
    clientName: "Jane Doe",
    clientEmail: "jane@example.com",
  };

  it("accepts valid booking", () => {
    expect(appointmentCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts booking with optional fields", () => {
    const result = appointmentCreateSchema.safeParse({
      ...valid,
      clientPhone: "(818) 555-1234",
      notes: "First time visit",
      turnstileToken: "token123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing serviceId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { serviceId: _serviceId, ...rest } = valid;
    expect(appointmentCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid UUID for serviceId", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, serviceId: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, date: "June 15" }).success
    ).toBe(false);
  });

  it("rejects invalid time format", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, startTime: "10am" }).success
    ).toBe(false);
  });

  it("rejects missing clientName", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, clientName: "" }).success
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, clientEmail: "not-email" }).success
    ).toBe(false);
  });

  it("rejects excessively long clientName", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, clientName: "x".repeat(201) }).success
    ).toBe(false);
  });

  it("rejects empty object", () => {
    expect(appointmentCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe("contactCreateSchema", () => {
  const valid = {
    name: "John Smith",
    email: "john@example.com",
  };

  it("accepts minimal valid contact", () => {
    expect(contactCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts full contact form", () => {
    const result = contactCreateSchema.safeParse({
      ...valid,
      phone: "(818) 555-5678",
      service: "Color",
      message: "Looking for a balayage appointment",
      turnstileToken: "token",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    expect(contactCreateSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      contactCreateSchema.safeParse({ name: "Test", email: "bad" }).success
    ).toBe(false);
  });

  it("rejects message over 3000 chars", () => {
    expect(
      contactCreateSchema.safeParse({ ...valid, message: "x".repeat(3001) }).success
    ).toBe(false);
  });
});

describe("adminServiceSchema", () => {
  const valid = {
    category: "Haircuts",
    name: "Wash + Cut + Style",
    price_text: "$80+",
    price_min: 8000,
    duration: 70,
  };

  it("accepts valid service", () => {
    expect(adminServiceSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts with optional fields", () => {
    const result = adminServiceSchema.safeParse({
      ...valid,
      image_url: "/images/haircut.jpg",
      active: false,
      sort_order: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    expect(
      adminServiceSchema.safeParse({ ...valid, price_min: -100 }).success
    ).toBe(false);
  });

  it("rejects zero duration", () => {
    expect(
      adminServiceSchema.safeParse({ ...valid, duration: 0 }).success
    ).toBe(false);
  });

  it("rejects duration over 600", () => {
    expect(
      adminServiceSchema.safeParse({ ...valid, duration: 601 }).success
    ).toBe(false);
  });

  it("rejects empty name", () => {
    expect(
      adminServiceSchema.safeParse({ ...valid, name: "" }).success
    ).toBe(false);
  });
});

describe("adminStylistSchema", () => {
  it("accepts valid stylist", () => {
    expect(
      adminStylistSchema.safeParse({ name: "Armen P.", bio: "Expert stylist" }).success
    ).toBe(true);
  });

  it("accepts specialties as array", () => {
    const result = adminStylistSchema.safeParse({
      name: "Test",
      specialties: ["Cutting", "Coloring"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts specialties as string", () => {
    const result = adminStylistSchema.safeParse({
      name: "Test",
      specialties: '["Cutting"]',
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(adminStylistSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("adminScheduleSchema", () => {
  it("accepts weekly rule", () => {
    const result = adminScheduleSchema.safeParse({
      ruleType: "weekly",
      dayOfWeek: 1,
      startTime: "10:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts override closure", () => {
    const result = adminScheduleSchema.safeParse({
      ruleType: "override",
      specificDate: "2025-12-25",
      isClosed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid dayOfWeek", () => {
    expect(
      adminScheduleSchema.safeParse({ ruleType: "weekly", dayOfWeek: 7 }).success
    ).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(
      adminScheduleSchema.safeParse({ ruleType: "override", specificDate: "Dec 25" }).success
    ).toBe(false);
  });
});

describe("adminAppointmentPatchSchema", () => {
  it("accepts status update", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ status: "confirmed" }).success
    ).toBe(true);
  });

  it("accepts staff notes", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ staff_notes: "VIP client" }).success
    ).toBe(true);
  });

  it("accepts date/time reschedule", () => {
    const result = adminAppointmentPatchSchema.safeParse({
      date: "2025-07-01",
      start_time: "14:00",
      end_time: "15:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ date: "bad" }).success
    ).toBe(false);
  });

  it("accepts empty object (all optional)", () => {
    expect(adminAppointmentPatchSchema.safeParse({}).success).toBe(true);
  });
});
