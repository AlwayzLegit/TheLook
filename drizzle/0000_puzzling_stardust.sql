CREATE TABLE "admin_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"appointment_id" uuid,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"stylist_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"client_name" varchar(200) NOT NULL,
	"client_email" varchar(200) NOT NULL,
	"client_phone" varchar(20),
	"notes" text,
	"staff_notes" text,
	"cancel_token" varchar(64),
	"reminder_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "appointments_cancel_token_unique" UNIQUE("cancel_token")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"phone" varchar(50),
	"service" varchar(120),
	"message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid,
	"rule_type" varchar(20) NOT NULL,
	"day_of_week" integer,
	"specific_date" varchar(10),
	"start_time" varchar(5),
	"end_time" varchar(5),
	"is_closed" boolean DEFAULT false,
	"note" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"price_text" varchar(50) NOT NULL,
	"price_min" integer NOT NULL,
	"duration" integer NOT NULL,
	"image_url" varchar(500),
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stylist_services" (
	"stylist_id" uuid NOT NULL,
	"service_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stylists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"bio" text,
	"image_url" varchar(500),
	"specialties" text,
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stylists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "admin_log" ADD CONSTRAINT "admin_log_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_client_email" ON "appointments" USING btree ("client_email");--> statement-breakpoint
CREATE INDEX "idx_appointments_date" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_appointments_stylist_date" ON "appointments" USING btree ("stylist_id","date");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");