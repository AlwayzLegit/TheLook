// Shared time-math + appointment-duration helpers used by both the
// inline edit panel on /admin/appointments and the AppointmentActions
// modal. Server stores times as zero-padded "HH:MM" strings; using
// minutes-since-midnight keeps the math trivial without pulling in
// a date library.

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  // Wrap at 24h so 23:30 + 60-min lands at 00:30, not 24:30. Salons
  // aren't open past midnight today but the math should still never
  // produce an invalid time string.
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function diffMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

export function formatDurationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "1h" : `${h}h`;
  return `${h}h ${m}m`;
}

interface AppointmentServiceRow {
  duration: number | null;
}

// Fetch SUM(duration) of appointment_services for one appointment via
// the admin endpoint. Falls back to (end - start) on the appointment
// row itself when there are no service rows (legacy / single-service
// imports). Both paths returned via { totalMinutes, serviceCount }
// so callers can render the helper line consistently.
export async function loadAppointmentDuration(
  appointmentId: string,
  fallbackStart: string,
  fallbackEnd: string,
): Promise<{ totalMinutes: number; serviceCount: number }> {
  const fallback = (() => {
    const d = diffMinutes(fallbackStart, fallbackEnd);
    return d > 0 ? { totalMinutes: d, serviceCount: 1 } : { totalMinutes: 0, serviceCount: 0 };
  })();

  try {
    const res = await fetch(`/api/admin/appointments/${appointmentId}/services`);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { services?: AppointmentServiceRow[] };
    const rows = Array.isArray(data?.services) ? data.services : [];
    if (rows.length === 0) return fallback;
    const sum = rows.reduce((acc, r) => acc + (r.duration || 0), 0);
    if (sum <= 0) return fallback;
    return { totalMinutes: sum, serviceCount: rows.length };
  } catch {
    return fallback;
  }
}
