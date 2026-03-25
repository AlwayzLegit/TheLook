import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID().replace(/-/g, "").slice(0, 16));

const timestamp = (name: string) =>
  text(name).default(sql`(datetime('now'))`);

export const services = sqliteTable("services", {
  id: id(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  priceText: text("price_text").notNull(),
  priceMin: integer("price_min").notNull(),
  duration: integer("duration").notNull(),
  active: integer("active").default(1),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const stylists = sqliteTable("stylists", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  specialties: text("specialties"),
  active: integer("active").default(1),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at"),
});

export const stylistServices = sqliteTable("stylist_services", {
  stylistId: text("stylist_id")
    .notNull()
    .references(() => stylists.id),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
});

export const scheduleRules = sqliteTable("schedule_rules", {
  id: id(),
  stylistId: text("stylist_id").references(() => stylists.id),
  ruleType: text("rule_type").notNull(),
  dayOfWeek: integer("day_of_week"),
  specificDate: text("specific_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  isClosed: integer("is_closed").default(0),
  note: text("note"),
  createdAt: timestamp("created_at"),
});

export const appointments = sqliteTable("appointments", {
  id: id(),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  stylistId: text("stylist_id")
    .notNull()
    .references(() => stylists.id),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("pending"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  notes: text("notes"),
  staffNotes: text("staff_notes"),
  cancelToken: text("cancel_token").unique(),
  reminderSent: integer("reminder_sent").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const adminLog = sqliteTable("admin_log", {
  id: id(),
  action: text("action").notNull(),
  appointmentId: text("appointment_id").references(() => appointments.id),
  details: text("details"),
  createdAt: timestamp("created_at"),
});
