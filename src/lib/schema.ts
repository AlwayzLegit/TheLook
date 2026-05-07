import { pgTable, text, integer, timestamp, uuid, boolean, varchar, index, primaryKey } from "drizzle-orm/pg-core";

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: varchar("category", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    priceText: varchar("price_text", { length: 50 }).notNull(),
    priceMin: integer("price_min").notNull(),
    duration: integer("duration").notNull(),
    active: boolean("active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("services_active_sort_idx").on(t.active, t.sortOrder)],
);

export const stylists = pgTable(
  "stylists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).unique().notNull(),
    bio: text("bio"),
    imageUrl: varchar("image_url", { length: 500 }),
    specialties: text("specialties"),
    active: boolean("active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("stylists_active_sort_idx").on(t.active, t.sortOrder)],
);

export const stylistServices = pgTable(
  "stylist_services",
  {
    stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
    serviceId: uuid("service_id").notNull().references(() => services.id),
  },
  (t) => [
    primaryKey({ columns: [t.stylistId, t.serviceId] }),
    index("stylist_services_service_idx").on(t.serviceId),
  ],
);

export const scheduleRules = pgTable(
  "schedule_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stylistId: uuid("stylist_id").references(() => stylists.id),
    ruleType: varchar("rule_type", { length: 20 }).notNull(),
    dayOfWeek: integer("day_of_week"),
    specificDate: varchar("specific_date", { length: 10 }),
    startTime: varchar("start_time", { length: 5 }),
    endTime: varchar("end_time", { length: 5 }),
    isClosed: boolean("is_closed").default(false),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("schedule_rules_weekly_idx").on(t.ruleType, t.dayOfWeek, t.stylistId),
    index("schedule_rules_override_idx").on(t.ruleType, t.specificDate, t.stylistId),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id").notNull().references(() => services.id),
    stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
    date: varchar("date", { length: 10 }).notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    clientName: varchar("client_name", { length: 200 }).notNull(),
    clientEmail: varchar("client_email", { length: 200 }).notNull(),
    clientPhone: varchar("client_phone", { length: 20 }),
    notes: text("notes"),
    staffNotes: text("staff_notes"),
    cancelToken: varchar("cancel_token", { length: 64 }).unique(),
    reminderSent: boolean("reminder_sent").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("appointments_stylist_date_idx").on(t.stylistId, t.date),
    index("appointments_date_status_idx").on(t.date, t.status),
    index("appointments_reminder_idx").on(t.date, t.status, t.reminderSent),
  ],
);

export const adminLog = pgTable("admin_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 50 }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});
