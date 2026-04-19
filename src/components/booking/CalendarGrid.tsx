"use client";

import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  // Fired whenever the visible month changes so the parent can clear stale
  // time slots (they belong to a date in the previous month).
  onMonthChange?: () => void;
}

export default function CalendarGrid({ selectedDate, onSelectDate, onMonthChange }: Props) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [closedDaysOfWeek, setClosedDaysOfWeek] = useState<number[]>([2]); // Tuesday default
  const [closedDates, setClosedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/schedule/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setClosedDaysOfWeek(Array.isArray(data.closedDaysOfWeek) ? data.closedDaysOfWeek : [2]);
        setClosedDates(new Set(Array.isArray(data.closedDates) ? data.closedDates : []));
      })
      .catch(() => {
        // Keep the Tuesday default on any failure.
      });
    return () => { cancelled = true; };
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const todayStr = today.toISOString().split("T")[0];
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    onMonthChange?.();
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    onMonthChange?.();
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-navy/40 hover:text-navy p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-heading text-lg">{monthName}</span>
        <button onClick={nextMonth} className="text-navy/40 hover:text-navy p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-xs font-body text-navy/40 py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          const dateObj = new Date(viewYear, viewMonth, day);
          const isPast = dateStr < todayStr;
          const isTooFar = dateObj > maxDate;
          const isWeeklyClosed = closedDaysOfWeek.includes(dateObj.getDay());
          const isSpecificClosed = closedDates.has(dateStr);
          const disabled = isPast || isTooFar || isWeeklyClosed || isSpecificClosed;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={day}
              onClick={() => !disabled && onSelectDate(dateStr)}
              disabled={disabled}
              title={isWeeklyClosed ? "Closed this day" : isSpecificClosed ? "Closed — holiday or special hours" : undefined}
              className={`aspect-square flex items-center justify-center text-sm font-body rounded transition-colors ${
                isSelected
                  ? "bg-rose text-white"
                  : isToday && !disabled
                    ? "bg-gold/20 text-navy hover:bg-rose/20"
                    : disabled
                      ? (isWeeklyClosed || isSpecificClosed)
                        ? "text-navy/25 line-through cursor-not-allowed"
                        : "text-navy/15 cursor-not-allowed"
                      : "text-navy hover:bg-rose/10"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
