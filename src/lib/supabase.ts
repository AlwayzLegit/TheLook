import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

// For server-side operations, use service role key if available
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "public-anon-key-placeholder";

export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

if (!hasSupabaseConfig) {
  console.warn("Supabase URL or API Key not set. Database features will not work.");
}

// Create a single supabase client for interacting with your database.
// We always return a client instance to keep type safety/simple call sites.
// `hasSupabaseConfig` controls whether DB-backed features should run.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Server-side only
  },
});

// Database types based on schema
export type Service = {
  id: string;
  category: string;
  name: string;
  price_text: string;
  price_min: number;
  duration: number;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Stylist = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_url: string | null;
  specialties: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Appointment = {
  id: string;
  service_id: string;
  stylist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  notes: string | null;
  staff_notes: string | null;
  cancel_token: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
};

export type ScheduleRule = {
  id: string;
  stylist_id: string | null;
  rule_type: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_closed: boolean;
  note: string | null;
  created_at: string;
};
