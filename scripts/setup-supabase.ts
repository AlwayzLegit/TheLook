import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log("🔄 Setting up Supabase database...\n");

  // Read and execute schema SQL
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

  console.log("📋 Creating tables...");
  const { error: schemaError } = await supabase.rpc("exec_sql", { sql: schemaSQL });
  
  if (schemaError) {
    // If exec_sql doesn't exist, we'll use REST API instead
    console.log("⚠️  exec_sql not available, using REST API...");
    
    // Check if tables exist by trying to query them
    const { error: servicesError } = await supabase
      .from("services")
      .select("count", { count: "exact", head: true });
    
    if (servicesError && servicesError.code === "42P01") {
      console.error("❌ Tables don't exist. Please run the SQL in Supabase SQL Editor:");
      console.log("   1. Go to https://app.supabase.com/project/quvvoxhiigdharzwxwja");
      console.log("   2. Open SQL Editor");
      console.log("   3. Paste contents of supabase/schema.sql");
      console.log("   4. Click Run\n");
      return false;
    }
  }

  console.log("✅ Tables ready\n");
  return true;
}

async function seedData() {
  console.log("🌱 Seeding data...\n");

  // Import seed data
  const { SALON_SERVICES, SALON_STYLISTS, SALON_HOURS } = await import("../src/lib/constants.js");

  // Check if already seeded
  const { count: serviceCount } = await supabase
    .from("services")
    .select("*", { count: "exact", head: true });

  if (serviceCount && serviceCount > 0) {
    console.log("⚠️  Data already seeded. Skipping...\n");
    return;
  }

  // Seed services
  console.log("📦 Inserting services...");
  const servicesToInsert = SALON_SERVICES.map((s, i) => ({
    category: s.category,
    name: s.name,
    price_text: s.priceText,
    price_min: s.priceMin,
    duration: s.duration,
    sort_order: i,
    active: true,
  }));

  const { data: insertedServices, error: servicesError } = await supabase
    .from("services")
    .insert(servicesToInsert)
    .select();

  if (servicesError) {
    console.error("❌ Error inserting services:", servicesError);
    return;
  }
  console.log(`✅ Inserted ${insertedServices?.length || 0} services\n`);

  // Seed stylists
  console.log("👥 Inserting stylists...");
  const stylistsToInsert = SALON_STYLISTS.map((st, i) => ({
    name: st.name,
    slug: st.slug,
    bio: st.bio,
    image_url: st.imageUrl,
    specialties: st.specialties,
    sort_order: i,
    active: true,
  }));

  const { data: insertedStylists, error: stylistsError } = await supabase
    .from("stylists")
    .insert(stylistsToInsert)
    .select();

  if (stylistsError) {
    console.error("❌ Error inserting stylists:", stylistsError);
    return;
  }
  console.log(`✅ Inserted ${insertedStylists?.length || 0} stylists\n`);

  // Map all stylists to all services
  console.log("🔗 Creating stylist-service mappings...");
  const mappings = [];
  for (const stylist of insertedStylists || []) {
    for (const service of insertedServices || []) {
      mappings.push({
        stylist_id: stylist.id,
        service_id: service.id,
      });
    }
  }

  const { error: mappingsError } = await supabase
    .from("stylist_services")
    .insert(mappings);

  if (mappingsError) {
    console.error("❌ Error creating mappings:", mappingsError);
    return;
  }
  console.log(`✅ Created ${mappings.length} mappings\n`);

  // Seed schedule rules
  console.log("📅 Inserting schedule rules...");
  const rulesToInsert = SALON_HOURS.map((h) => ({
    rule_type: "weekly",
    day_of_week: h.dayOfWeek,
    start_time: h.startTime,
    end_time: h.endTime,
    is_closed: h.isClosed === 1,
  }));

  const { error: rulesError } = await supabase
    .from("schedule_rules")
    .insert(rulesToInsert);

  if (rulesError) {
    console.error("❌ Error inserting schedule rules:", rulesError);
    return;
  }
  console.log(`✅ Inserted ${rulesToInsert.length} schedule rules\n`);

  console.log("🎉 Seeding complete!\n");
}

async function main() {
  const tablesReady = await setupDatabase();
  if (tablesReady) {
    await seedData();
  }
  
  console.log("==============================================");
  console.log("  Setup finished!");
  console.log("==============================================");
}

main().catch(console.error);
