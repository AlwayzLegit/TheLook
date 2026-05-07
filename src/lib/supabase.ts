import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Resolve from both public and server env names used across providers/tooling.
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

// For server-side operations prefer service role, fallback to anon/public key.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseKey
);

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;
  if (!hasSupabaseConfig) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY."
    );
  }
  _supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Server-side only
    },
  });
  return _supabase;
}

// Lazy proxy avoids build-time crashes when env vars are not present.
// Typed as SupabaseClient so .from(), .auth, .storage etc. surface
// proper signatures at every call site (without the Database generic
// — we don't generate types from the schema today, but the method
// shapes still type-check).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
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
