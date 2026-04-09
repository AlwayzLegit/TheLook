import { createClient } from "@supabase/supabase-js";
import { SALON_SERVICES, SALON_STYLISTS, SALON_HOURS } from "../src/lib/constants.js";

const supabaseUrl = "https://hrrijetwksnfjtrcxihk.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycmlqZXR3a3NuZmp0cmN4aWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwODQxOCwiZXhwIjoyMDkxMjg0NDE4fQ.XZcAGVD3EHT7qYQQZlt9iZm-sf6xK5CB8sLjDfgLlj0";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function seedData() {
  console.log("🌱 Seeding data...\n");

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

  console.log("🎉 Seeding complete!");
}

seedData().catch(console.error);
