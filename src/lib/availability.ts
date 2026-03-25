import { db } from "./db";
import { scheduleRules, appointments, services } from "./schema";
import { eq, and, ne } from "drizzle-orm";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export async function getAvailableSlots(
  stylistId: string,
  serviceId: string,
  date: string
): Promise<string[]> {
  // Validate date is not in the past and within 60 days
  const dateObj = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  if (dateObj < today || dateObj > maxDate) return [];

  const dayOfWeek = dateObj.getUTCDay();

  // Get schedule: check overrides first, then weekly rules
  const allRules = await db
    .select()
    .from(scheduleRules)
    .where(eq(scheduleRules.ruleType, "override"));

  const stylistOverride = allRules.find(
    (r) => r.specificDate === date && r.stylistId === stylistId
  );
  const salonOverride = allRules.find(
    (r) => r.specificDate === date && !r.stylistId
  );

  const weeklyRules = await db
    .select()
    .from(scheduleRules)
    .where(
      and(eq(scheduleRules.ruleType, "weekly"), eq(scheduleRules.dayOfWeek, dayOfWeek))
    );

  const stylistWeekly = weeklyRules.find((r) => r.stylistId === stylistId);
  const salonWeekly = weeklyRules.find((r) => !r.stylistId);

  const rule = stylistOverride || salonOverride || stylistWeekly || salonWeekly;

  if (!rule || rule.isClosed || !rule.startTime || !rule.endTime) return [];

  // Get service duration
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId));
  if (!service) return [];

  const openMins = timeToMinutes(rule.startTime);
  const closeMins = timeToMinutes(rule.endTime);
  const duration = service.duration;

  // Generate 30-min aligned slots
  const allSlots: string[] = [];
  for (let start = openMins; start + duration <= closeMins; start += 30) {
    allSlots.push(minutesToTime(start));
  }

  // Get existing appointments for this stylist on this date
  const existing = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.stylistId, stylistId),
        eq(appointments.date, date),
        ne(appointments.status, "cancelled")
      )
    );

  // Filter out conflicting slots
  return allSlots.filter((slotTime) => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + duration;

    return !existing.some((appt) => {
      const apptStart = timeToMinutes(appt.startTime);
      const apptEnd = timeToMinutes(appt.endTime);
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  });
}
