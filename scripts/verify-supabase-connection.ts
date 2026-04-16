import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface TableCheck {
  name: string;
  count: number | null;
  ok: boolean;
  error?: string;
}

async function verifyConnection() {
  console.log("=== Supabase Connection Verification ===\n");
  console.log("URL:", supabaseUrl);
  console.log("");

  const tables = [
    "services",
    "stylists",
    "stylist_services",
    "schedule_rules",
    "appointments",
    "contact_messages",
    "admin_log",
    "client_profiles",
    "discounts",
    "discount_usage",
  ];

  const results: TableCheck[] = [];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    const result: TableCheck = {
      name: table,
      count: count,
      ok: !error,
      error: error?.message,
    };
    results.push(result);

    const status = error ? "FAIL" : "OK";
    const detail = error ? error.message : `${count} rows`;
    console.log(`  ${status}  ${table} — ${detail}`);
  }

  // Test RPC function
  console.log("");
  const { error: rpcError } = await supabase.rpc("get_booked_slots", {
    p_stylist_id: "00000000-0000-0000-0000-000000000000",
    p_date: "2026-01-01",
  });
  if (rpcError) {
    console.log(`  FAIL  rpc/get_booked_slots — ${rpcError.message}`);
  } else {
    console.log("  OK    rpc/get_booked_slots — accessible");
  }

  const failed = results.filter((r) => !r.ok);
  console.log("");
  if (failed.length === 0 && !rpcError) {
    console.log("All checks passed.");
  } else {
    console.log(`${failed.length} table(s) failed.`);
    process.exit(1);
  }
}

verifyConnection().catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
