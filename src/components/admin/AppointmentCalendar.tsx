"use client";

import { useMemo, useState } from "react";
import { todayISOInLA, dayOfWeekInLA } from "@/lib/datetime";

interface CalendarAppointment {
  id: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;
  status: string;
  client_name: string;
  serviceName: string;
  stylistName: string;
  totalPriceText?: string | null;
}

interface Props {
  appointments: CalendarAppointment[];
  onSelectAppointment?: (id: string) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function statusColor(status: string) {
  switch (status) {
    case "pending":   return "bg-amber-100 text-amber-800 border-amber-300";
    case "confirmed": return "bg-emerald-50 text-emerald-800 border-emerald-300";
    case "cancelled": return "bg-rose-50 text-rose-700 border-rose-200";
    case "no_show":   return "bg-rose-100 text-rose-800 border-rose-300";
    case "completed": return "bg-navy/5 text-navy/70 border-navy/20";
    default:          return "bg-navy/5 text-navy/70 border-navy/20";
  }
}

export default function AppointmentCalendar({ appointments, onSelectAppointment }: Props) {
  const today = todayISOInLA();
  const [year, month] = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    return [y, m - 1];
  }, [today]);

  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Group appointments by date once.
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const a of appointments) {
      const list = map.get(a.date) || [];
      list.push(a);
      map.set(a.date, list);
    }
    for (const list of map.values()) list.sort((x, y) => x.start_time.localeCompare(y.start_time));
    return map;
  }, [appointments]);

  // Build a 6-row × 7-col grid starting on the Sunday of the first day of the month.
  const grid = useMemo(() => {
    const firstISO = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const firstDow = dayOfWeekInLA(firstISO);
    const firstDate = new Date(viewYear, viewMonth, 1);
    const cells: Array<{ iso: string; inMonth: boolean }> = [];
    const startMs = firstDate.getTime() - firstDow * 86_400_000;
    for (let i = 0; i < 42; i++) {
      const d = new Date(startMs + i * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      cells.push({ iso, inMonth: d.getMonth() === viewMonth });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(year); setViewMonth(month); setSelectedDate(today); };

  const dayAppointments = byDate.get(selectedDate) || [];

  return (
    <div className="bg-white border border-navy/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy/10">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} aria-label="Previous month" className="p-2 hover:bg-navy/5 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="font-heading text-lg min-w-[180px] text-center">{formatMonth(viewYear, viewMonth)}</h3>
          <button onClick={goNext} aria-label="Next month" className="p-2 hover:bg-navy/5 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <button onClick={goToday} className="text-xs font-body text-navy/60 hover:text-navy uppercase tracking-widest">
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 px-2 pt-2">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-body text-navy/40 uppercase tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-navy/5 px-2 pb-2">
        {grid.map((cell) => {
          const list = byDate.get(cell.iso) || [];
          const isSelected = selectedDate === cell.iso;
          const isToday = cell.iso === today;
          const dayNum = parseInt(cell.iso.slice(-2), 10);
          return (
            <button
              key={cell.iso}
              onClick={() => setSelectedDate(cell.iso)}
              className={`relative aspect-square bg-white p-1 sm:p-2 text-left transition-colors ${
                isSelected ? "ring-2 ring-rose ring-inset" : "hover:bg-cream/40"
              } ${cell.inMonth ? "" : "opacity-40"}`}
            >
              <span className={`text-xs font-body ${isToday ? "bg-navy text-white rounded-full px-1.5 py-0.5" : "text-navy"}`}>
                {dayNum}
              </span>
              {list.length > 0 && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose rounded-full" />
              )}
              {list.length > 1 && (
                <span className="absolute bottom-1 left-1/2 translate-x-2 w-1.5 h-1.5 bg-rose/50 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-navy/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="font-heading text-base">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </h4>
          <span className="text-xs font-body text-navy/40">
            {dayAppointments.length} appointment{dayAppointments.length === 1 ? "" : "s"}
          </span>
        </div>
        {dayAppointments.length === 0 ? (
          <p className="text-navy/40 font-body text-sm py-6 text-center">No appointments on this day.</p>
        ) : (
          <ul className="divide-y divide-navy/5">
            {dayAppointments.map((a) => (
              <li
                key={a.id}
                className="py-3 flex items-center gap-3 cursor-pointer hover:bg-cream/30 px-2 -mx-2 transition-colors"
                onClick={() => onSelectAppointment?.(a.id)}
              >
                <div className="text-xs font-body text-navy/60 w-20 shrink-0">
                  {formatTime(a.start_time)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-bold text-navy truncate">{a.client_name}</p>
                  <p className="text-xs font-body text-navy/60 truncate">
                    {a.serviceName} · {a.stylistName}
                  </p>
                </div>
                {a.totalPriceText && (
                  <div className="text-sm font-heading text-gold shrink-0">{a.totalPriceText}</div>
                )}
                <span className={`text-[10px] uppercase tracking-widest border px-2 py-1 font-body ${statusColor(a.status)}`}>
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
