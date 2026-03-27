import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { services, stylists, stylistServices, scheduleRules } from "./schema";
import { SALON_SERVICES, SALON_STYLISTS, SALON_HOURS } from "./constants";

async function seed() {
  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || "");
  const db = drizzle(sql);

  console.log("Seeding database...");

  // Seed services
  const insertedServices = [];
  for (let i = 0; i < SALON_SERVICES.length; i++) {
    const s = SALON_SERVICES[i];
    const [row] = await db.insert(services).values({
      category: s.category,
      name: s.name,
      priceText: s.priceText,
      priceMin: s.priceMin,
      duration: s.duration,
      sortOrder: i,
    }).returning();
    insertedServices.push(row);
  }
  console.log(`Seeded ${insertedServices.length} services`);

  // Seed stylists
  const insertedStylists = [];
  for (let i = 0; i < SALON_STYLISTS.length; i++) {
    const st = SALON_STYLISTS[i];
    const [row] = await db.insert(stylists).values({
      name: st.name,
      slug: st.slug,
      bio: st.bio,
      imageUrl: st.imageUrl,
      specialties: st.specialties,
      sortOrder: i,
    }).returning();
    insertedStylists.push(row);
  }
  console.log(`Seeded ${insertedStylists.length} stylists`);

  // All stylists can perform all services
  for (const stylist of insertedStylists) {
    for (const service of insertedServices) {
      await db.insert(stylistServices).values({
        stylistId: stylist.id,
        serviceId: service.id,
      });
    }
  }
  console.log("Seeded stylist-service mappings");

  // Seed salon-wide schedule
  for (const h of SALON_HOURS) {
    await db.insert(scheduleRules).values({
      ruleType: "weekly",
      dayOfWeek: h.dayOfWeek,
      startTime: h.startTime,
      endTime: h.endTime,
      isClosed: h.isClosed === 1,
    });
  }
  console.log("Seeded schedule rules");

  console.log("Done!");
}

seed().catch(console.error);
