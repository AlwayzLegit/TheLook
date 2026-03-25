import { db } from "./db";
import { services, stylists, stylistServices, scheduleRules } from "./schema";
import { SALON_SERVICES, SALON_STYLISTS, SALON_HOURS } from "./constants";

async function seed() {
  console.log("Seeding database...");

  // Seed services
  const serviceIds: Record<string, string> = {};
  for (let i = 0; i < SALON_SERVICES.length; i++) {
    const s = SALON_SERVICES[i];
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    serviceIds[s.name] = id;
    await db.insert(services).values({
      id,
      category: s.category,
      name: s.name,
      priceText: s.priceText,
      priceMin: s.priceMin,
      duration: s.duration,
      sortOrder: i,
    });
  }
  console.log(`Seeded ${SALON_SERVICES.length} services`);

  // Seed stylists
  const stylistIds: string[] = [];
  for (let i = 0; i < SALON_STYLISTS.length; i++) {
    const st = SALON_STYLISTS[i];
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    stylistIds.push(id);
    await db.insert(stylists).values({
      id,
      name: st.name,
      slug: st.slug,
      bio: st.bio,
      imageUrl: st.imageUrl,
      specialties: st.specialties,
      sortOrder: i,
    });
  }
  console.log(`Seeded ${SALON_STYLISTS.length} stylists`);

  // All stylists can perform all services
  for (const stylistId of stylistIds) {
    for (const serviceId of Object.values(serviceIds)) {
      await db.insert(stylistServices).values({ stylistId, serviceId });
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
      isClosed: h.isClosed,
    });
  }
  console.log("Seeded schedule rules");

  console.log("Done!");
}

seed().catch(console.error);
