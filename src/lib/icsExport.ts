/**
 * Generate an .ics calendar file and trigger download.
 */

interface IcsEvent {
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIcsDate(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
}

export function downloadIcs(events: IcsEvent[], filename = "appointments.ics") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Look Hair Salon//Appointments//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART:${toIcsDate(event.date, event.startTime)}`,
      `DTEND:${toIcsDate(event.date, event.endTime)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
      `LOCATION:${event.location}`,
      `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@thelookhairsalon.com`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
