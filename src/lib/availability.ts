import { supabase, hasSupabaseConfig } from "./supabase";
import { BOOKING } from "./constants";
import {
  addDaysISOInLA,
  dayOfWeekInLA,
  isPastDateInLA,
  nowMinutesInLA,
  todayISOInLA,
} from "./datetime";

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
  // Either a single service id (legacy) or an array of ids for multi-service bookings.
  // Duplicates in the array are additive (e.g. two variants of the same service).
  serviceIdOrIds: string | string[],
  date: string,
  // When set, overrides the service-table duration lookup. Used by the
  // booking POST to pass variant-aware totals (Brow 10 + Lip 10 = 20 min
  // even though the underlying service row's duration is 10).
  totalDurationOverride?: number,
): Promise<string[]> {
  const todayISO = todayISOInLA();
  const maxISO = addDaysISOInLA(BOOKING.MAX_ADVANCE_DAYS);
  if (isPastDateInLA(date) || date > maxISO) return [];

  // Local/dev fallback when Supabase isn't configured.
  if (!hasSupabaseConfig) {
    return ["10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "15:00", "16:00"];
  }

  const dayOfWeek = dayOfWeekInLA(date);

  // Get all schedule rules
  const { data: allRules, error: rulesError } = await supabase
    .from("schedule_rules")
    .select("*")
    .eq("rule_type", "override");

  if (rulesError) {
    console.error("Error fetching schedule rules:", rulesError);
  }

  type ScheduleRuleRow = {
    stylist_id: string | null;
    rule_type: string;
    day_of_week: number | null;
    specific_date: string | null;
    start_time: string | null;
    end_time: string | null;
    is_closed: boolean | null;
    note: string | null;
  };

  const overrideRows = (allRules || []) as ScheduleRuleRow[];
  const stylistOverride = overrideRows.find(
    (r) => r.specific_date === date && r.stylist_id === stylistId,
  );
  const salonOverride = overrideRows.find(
    (r) => r.specific_date === date && !r.stylist_id,
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

  const weeklyRows = (weeklyRules || []) as ScheduleRuleRow[];
  const stylistWeekly = weeklyRows.find((r) => r.stylist_id === stylistId);
  const salonWeekly = weeklyRows.find((r) => !r.stylist_id);

  // B-04: a stylist with NO rule for the requested day is closed for that
  // day — the salon being open doesn't auto-grant per-stylist availability.
  // Fall back to salon hours ONLY when the stylist has zero weekly rules
  // configured anywhere (newly-added stylist), so an empty schedule isn't a
  // hard outage. Once any rule is set, missing days mean "off".
  const { data: anyStylistRules } = await supabase
    .from("schedule_rules")
    .select("id")
    .eq("rule_type", "weekly")
    .eq("stylist_id", stylistId)
    .limit(1);
  const stylistHasAnySchedule = (anyStylistRules || []).length > 0;

  let activeRule: { start_time: string | null; end_time: string | null; is_closed: boolean | null } | undefined;
  if (stylistOverride) {
    // Stylist-specific date override wins (vacation, extra shift, etc.).
    activeRule = stylistOverride;
  } else if (salonOverride) {
    // Salon-wide date override (holiday closure, early-close day) applies
    // to everyone — a stylist's weekly rule can't override the salon being
    // closed for the day.
    activeRule = salonOverride;
  } else if (stylistWeekly) {
    activeRule = stylistWeekly;
  } else if (stylistHasAnySchedule) {
    // Stylist has a schedule, but no rule for this day — they're off.
    return [];
  } else if (salonWeekly) {
    activeRule = salonWeekly;
  } else {
    // No rules at all anywhere — fall back to constants so dev/local works.
    const fallbackWeekly: Record<number, { start_time: string; end_time: string; is_closed: boolean }> = {
      0: { start_time: "10:00", end_time: "17:00", is_closed: false },
      1: { start_time: "10:00", end_time: "18:00", is_closed: false },
      2: { start_time: "10:00", end_time: "18:00", is_closed: true },
      3: { start_time: "10:00", end_time: "18:00", is_closed: false },
      4: { start_time: "10:00", end_time: "18:00", is_closed: false },
      5: { start_time: "10:00", end_time: "18:00", is_closed: false },
      6: { start_time: "10:00", end_time: "18:00", is_closed: false },
    };
    activeRule = fallbackWeekly[dayOfWeek];
  }

  if (!activeRule || activeRule.is_closed || !activeRule.start_time || !activeRule.end_time) return [];

  // Get total duration from one or more services
  const ids = Array.isArray(serviceIdOrIds) ? serviceIdOrIds : [serviceIdOrIds];

  const openMins = timeToMinutes(activeRule.start_time);
  const closeMins = timeToMinutes(activeRule.end_time);

  let duration: number;
  if (typeof totalDurationOverride === "number" && totalDurationOverride > 0) {
    // Caller already computed the effective duration (variant-aware).
    duration = totalDurationOverride;
  } else {
    const { data: services, error: serviceError } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", [...new Set(ids)]);
    if (serviceError || !services || services.length === 0) {
      console.error("Error fetching service:", serviceError);
      return ["10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "15:00", "16:00"];
    }
    // Respect duplicates: if the same id appears twice (two variants of one
    // parent), the duration is added twice.
    type SvcRow = { id: string; duration: number | null };
    const byId = new Map<string, number>(
      (services as SvcRow[]).map((s) => [s.id, s.duration || 0]),
    );
    duration = ids.reduce((sum, id) => sum + (byId.get(id) || 0), 0);
  }

  // Generate slots aligned to BOOKING.SLOT_INCREMENT_MINUTES (currently 15).
  const allSlots: string[] = [];
  // For today, drop any slots that have already started in LA time. Add a
  // 15-min lead so customers can't book a slot starting right now.
  const isToday = date === todayISO;
  const cutoffMins = isToday ? nowMinutesInLA() + 15 : -1;
  for (let start = openMins; start + duration <= closeMins; start += BOOKING.SLOT_INCREMENT_MINUTES) {
    if (start < cutoffMins) continue;
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
