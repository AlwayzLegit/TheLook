"use client";

import { useEffect, useState } from "react";

interface DayHours {
  start: string | null;
  end: string | null;
  closed: boolean;
}

interface ScheduleResponse {
  weeklyHours?: Record<string, DayHours>;
  closedDaysOfWeek?: number[];
}

interface Props {
  // Each instance picks a visual variant so the same data renders neutrally
  // on the cream Contact page AND on the dark navy Footer.
  variant?: "light" | "dark";
  // Optional extra class on the outer wrapper.
  className?: string;
}

// Fallback used before the fetch resolves (and if /api/schedule/public
// ever fails) so the user still sees hours on first paint.
const DEFAULT: Record<number, DayHours> = {
  0: { start: "10:00", end: "17:00", closed: false },
  1: { start: "10:00", end: "18:00", closed: false },
  2: { start: null, end: null, closed: true },
  3: { start: "10:00", end: "18:00", closed: false },
  4: { start: "10:00", end: "18:00", closed: false },
  5: { start: "10:00", end: "18:00", closed: false },
  6: { start: "10:00", end: "18:00", closed: false },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Render order — we want Monday first, not Sunday.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function fmt12(time: string | null): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return m === 0 ? `${hh} ${ampm}` : `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function SalonHours({ variant = "light", className = "" }: Props) {
  const [hours, setHours] = useState<Record<number, DayHours>>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/schedule/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ScheduleResponse | null) => {
        if (cancelled || !data?.weeklyHours) return;
        const parsed: Record<number, DayHours> = { ...DEFAULT };
        for (const [k, v] of Object.entries(data.weeklyHours)) {
          const d = Number(k);
          if (Number.isInteger(d) && d >= 0 && d <= 6 && v) parsed[d] = v as DayHours;
        }
        setHours(parsed);
      })
      .catch(() => {
        // Keep defaults.
      });
    return () => { cancelled = true; };
  }, []);

  const isDark = variant === "dark";
  const openClass = isDark ? "text-white/75" : "text-navy/70";
  const closedClass = isDark ? "text-white/60" : "text-navy/60";

  return (
    <div className={`text-sm font-body font-light space-y-2 ${className}`}>
      {ORDER.map((d) => {
        const row = hours[d];
        const closed = row.closed || !row.start || !row.end;
        return (
          <div
            key={d}
            className={`flex justify-between ${closed ? closedClass : openClass}`}
          >
            <span>{DAY_NAMES[d]}</span>
            <span>
              {closed ? "Closed" : `${fmt12(row.start)} – ${fmt12(row.end)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
