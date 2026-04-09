import { supabase, hasSupabaseConfig } from "./supabase";

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

  // Local/dev fallback when Supabase isn't configured.
  if (!hasSupabaseConfig) {
    return ["10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "15:00", "16:00"];
  }

  const dayOfWeek = dateObj.getDay();

  // Get all schedule rules
  const { data: allRules, error: rulesError } = await supabase
    .from("schedule_rules")
    .select("*")
    .eq("rule_type", "override");

  if (rulesError) {
    console.error("Error fetching schedule rules:", rulesError);
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
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistWeekly = (weeklyRules || []).find((r: any) => r.stylist_id === stylistId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salonWeekly = (weeklyRules || []).find((r: any) => !r.stylist_id);

  const rule = stylistOverride || salonOverride || stylistWeekly || salonWeekly;
  const fallbackWeekly: Record<number, { start_time: string; end_time: string; is_closed: boolean }> = {
    0: { start_time: "10:00", end_time: "17:00", is_closed: false }, // Sunday
    1: { start_time: "10:00", end_time: "18:00", is_closed: false }, // Monday
    2: { start_time: "10:00", end_time: "18:00", is_closed: true },  // Tuesday closed
    3: { start_time: "10:00", end_time: "18:00", is_closed: false }, // Wednesday
    4: { start_time: "10:00", end_time: "18:00", is_closed: false }, // Thursday
    5: { start_time: "10:00", end_time: "18:00", is_closed: false }, // Friday
    6: { start_time: "10:00", end_time: "18:00", is_closed: false }, // Saturday
  };
  const activeRule = rule || fallbackWeekly[dayOfWeek];

  if (!activeRule || activeRule.is_closed || !activeRule.start_time || !activeRule.end_time) return [];

  // Get service duration
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    console.error("Error fetching service:", serviceError);
    return ["10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "15:00", "16:00"];
  }

  const openMins = timeToMinutes(activeRule.start_time);
  const closeMins = timeToMinutes(activeRule.end_time);
  const duration = service.duration;

  // Generate 30-min aligned slots
  const allSlots: string[] = [];
  for (let start = openMins; start + duration <= closeMins; start += 30) {
    allSlots.push(minutesToTime(start));
  }

  // Get existing bookings via RPC (security-definer in DB) to avoid exposing table reads.
  const { data: existing, error: apptError } = await supabase.rpc("get_booked_slots", {
    p_stylist_id: stylistId,
    p_date: date,
  });

  if (apptError) {
    console.error("Error fetching appointments:", apptError);
    return allSlots;
  }

  // Filter out conflicting slots
  return allSlots.filter((slotTime) => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + duration;

    return !(existing || []).some((appt: { start_time: string; end_time: string }) => {
      const apptStart = timeToMinutes(appt.start_time.slice(0, 5));
      const apptEnd = timeToMinutes(appt.end_time.slice(0, 5));
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  });
}
