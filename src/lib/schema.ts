import { pgTable, text, integer, timestamp, uuid, boolean, varchar, index } from "drizzle-orm/pg-core";

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  priceText: varchar("price_text", { length: 50 }).notNull(),
  priceMin: integer("price_min").notNull(),
  duration: integer("duration").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stylists = pgTable("stylists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  bio: text("bio"),
  imageUrl: varchar("image_url", { length: 500 }),
  specialties: text("specialties"), // JSON string
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stylistServices = pgTable("stylist_services", {
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
});

export const scheduleRules = pgTable("schedule_rules", {
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
});

export const appointments = pgTable("appointments", {
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
}, (table) => [
  index("idx_appointments_client_email").on(table.clientEmail),
  index("idx_appointments_date").on(table.date),
  index("idx_appointments_stylist_date").on(table.stylistId, table.date),
  index("idx_appointments_status").on(table.status),
]);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  service: varchar("service", { length: 120 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminLog = pgTable("admin_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 50 }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 200 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("stylist"),
  stylistId: uuid("stylist_id").references(() => stylists.id),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_admin_users_email").on(table.email),
]);

// Waitlist: clients waiting for a cancellation
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  stylistId: uuid("stylist_id").references(() => stylists.id),
  clientName: varchar("client_name", { length: 200 }).notNull(),
  clientEmail: varchar("client_email", { length: 200 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }),
  preferredDate: varchar("preferred_date", { length: 10 }),
  preferredTimeRange: varchar("preferred_time_range", { length: 50 }), // "morning", "afternoon", "evening"
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // "waiting", "notified", "booked", "expired"
  createdAt: timestamp("created_at").defaultNow(),
});

// Stylist commission config
export const stylistCommissions = pgTable("stylist_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id).unique(),
  commissionPercent: integer("commission_percent").notNull().default(50), // e.g. 50 = 50%
  hourlyRate: integer("hourly_rate"), // in cents per hour, optional
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deposits / payments
export const deposits = pgTable("deposits", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull(), // "pending", "succeeded", "refunded", "failed"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory / products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  category: varchar("category", { length: 50 }), // "color", "treatment", "styling", "retail"
  sku: varchar("sku", { length: 100 }),
  stockQty: integer("stock_qty").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  costPrice: integer("cost_price"), // wholesale cost in cents
  retailPrice: integer("retail_price"), // selling price if sold retail
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product usage per appointment (optional tracking)
export const productUsage = pgTable("product_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantityUsed: integer("quantity_used").default(1),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client magic link tokens (for self-service portal)
export const clientAccessTokens = pgTable("client_access_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 200 }).notNull(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_client_access_tokens_token").on(table.token),
]);

export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 200 }).unique().notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  preferredStylistId: uuid("preferred_stylist_id").references(() => stylists.id),
  tags: text("tags"), // JSON array: ["VIP", "color specialist", "sensitive scalp"]
  preferences: text("preferences"), // free-form notes about preferences
  internalNotes: text("internal_notes"), // private staff notes
  allergyInfo: text("allergy_info"), // product allergies or sensitivities
  hairFormulas: text("hair_formulas"), // JSON: color formulas, treatments
  hairType: varchar("hair_type", { length: 100 }), // e.g. "Fine, straight, level 6"
  birthday: varchar("birthday", { length: 10 }), // MM-DD for birthday promotions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_client_profiles_email").on(table.email),
]);

export const discounts = pgTable("discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  type: varchar("type", { length: 20 }).notNull(), // "percentage" or "fixed"
  value: integer("value").notNull(), // percentage (e.g. 20 = 20%) or cents (e.g. 2000 = $20)
  minPurchase: integer("min_purchase").default(0), // minimum service price in cents
  maxUses: integer("max_uses"), // null = unlimited
  usesCount: integer("uses_count").default(0),
  validFrom: varchar("valid_from", { length: 10 }), // YYYY-MM-DD
  validUntil: varchar("valid_until", { length: 10 }), // YYYY-MM-DD
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discountUsage = pgTable("discount_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  discountId: uuid("discount_id").notNull().references(() => discounts.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  clientEmail: varchar("client_email", { length: 200 }).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

export const clientPhotos = pgTable("client_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientEmail: varchar("client_email", { length: 200 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  caption: varchar("caption", { length: 255 }),
  photoType: varchar("photo_type", { length: 20 }), // "before", "after", "result", "inspiration"
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  serviceId: uuid("service_id").references(() => services.id),
  takenAt: varchar("taken_at", { length: 10 }), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_client_photos_email").on(table.clientEmail),
]);
