import { supabase } from "./supabase";

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

  // Get all schedule rules
  const { data: allRules, error: rulesError } = await supabase
    .from("schedule_rules")
    .select("*")
    .eq("rule_type", "override");

  if (rulesError) {
    console.error("Error fetching schedule rules:", rulesError);
    return [];
  }

  const stylistOverride = (allRules || []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.specific_date === date && r.stylist_id === stylistId
  );
  const salonOverride = (allRules || []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.specific_date === date && !r.stylist_id
  );

  // Get weekly rules
  const { data: weeklyRules, error: weeklyError } = await supabase
    .from("schedule_rules")
    .select("*")
    .eq("rule_type", "weekly")
    .eq("day_of_week", dayOfWeek);

  if (weeklyError) {
    console.error("Error fetching weekly rules:", weeklyError);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistWeekly = (weeklyRules || []).find((r: any) => r.stylist_id === stylistId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salonWeekly = (weeklyRules || []).find((r: any) => !r.stylist_id);

  const rule = stylistOverride || salonOverride || stylistWeekly || salonWeekly;

  if (!rule || rule.is_closed || !rule.start_time || !rule.end_time) return [];

  // Get service duration
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    console.error("Error fetching service:", serviceError);
    return [];
  }

  const openMins = timeToMinutes(rule.start_time);
  const closeMins = timeToMinutes(rule.end_time);
  const duration = service.duration;

  // Generate 30-min aligned slots
  const allSlots: string[] = [];
  for (let start = openMins; start + duration <= closeMins; start += 30) {
    allSlots.push(minutesToTime(start));
  }

  // Get existing appointments for this stylist on this date
  const { data: existing, error: apptError } = await supabase
    .from("appointments")
    .select("*")
    .eq("stylist_id", stylistId)
    .eq("date", date)
    .neq("status", "cancelled");

  if (apptError) {
    console.error("Error fetching appointments:", apptError);
    return [];
  }

  // Filter out conflicting slots
  return allSlots.filter((slotTime) => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + duration;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !(existing || []).some((appt: any) => {
      const apptStart = timeToMinutes(appt.start_time);
      const apptEnd = timeToMinutes(appt.end_time);
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  });
}
