"use client";

import { useMemo, useState } from "react";
import { todayISOInLA, dayOfWeekInLA } from "@/lib/datetime";
import { formatTime, formatDate } from "@/lib/format";
import { Badge, badgeToneForStatus } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

interface CalendarAppointment {
  id: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;
  status: string;
  client_name: string;
  serviceName: string;
  stylistId?: string | null;
  stylistName: string;
  stylistColor?: string | null;
  totalPriceText?: string | null;
  // false = booking landed via "Any Stylist" (system picked the stylist
  // for the customer). null/true = customer specifically asked for this
  // stylist. Used to render a small badge in the day list so admin
  // knows at a glance without opening the row.
  requested_stylist?: boolean | null;
}

interface Props {
  appointments: CalendarAppointment[];
  onSelectAppointment?: (id: string) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} aria-label="Previous month" className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-cream-200)]/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="text-[1.0625rem] min-w-[180px] text-center font-medium text-[var(--color-text)]">{formatMonth(viewYear, viewMonth)}</h3>
          <button onClick={goNext} aria-label="Next month" className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-cream-200)]/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <button onClick={goToday} className="text-[0.6875rem] uppercase tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1 rounded-sm hover:bg-[var(--color-cream-200)]/60">
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 px-2 pt-2 bg-[var(--color-surface)]">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[0.625rem] text-[var(--color-text-subtle)] uppercase tracking-widest py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--color-border)] px-2 pb-2">
        {grid.map((cell) => {
          const list = byDate.get(cell.iso) || [];
          const isSelected = selectedDate === cell.iso;
          const isToday = cell.iso === today;
          const dayNum = parseInt(cell.iso.slice(-2), 10);
          const pillCount = 2;
          const visible = list.slice(0, pillCount);
          const overflow = list.length - visible.length;
          return (
            <button
              key={cell.iso}
              onClick={() => setSelectedDate(cell.iso)}
              className={cn(
                "relative min-h-[72px] sm:min-h-[92px] bg-[var(--color-surface)] p-1 sm:p-1.5 text-left transition-colors overflow-hidden",
                isSelected ? "ring-2 ring-[var(--color-crimson-600)] ring-inset" : "hover:bg-[var(--color-cream-50)]",
                !cell.inMonth && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center text-[0.6875rem] min-w-[1.25rem] h-5 rounded-full px-1.5",
                  isToday ? "bg-[var(--color-crimson-600)] text-white font-medium" : "text-[var(--color-text)]",
                )}
              >
                {dayNum}
              </span>
              {visible.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {visible.map((a) => {
                    const cancelled = a.status === "cancelled" || a.status === "no_show";
                    const color = a.stylistColor || "var(--color-crimson-600)";
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "text-[0.625rem] sm:text-[0.6875rem] px-1.5 py-0.5 rounded-sm truncate border-l-[3px]",
                          cancelled ? "opacity-50" : "",
                        )}
                        style={{
                          borderLeftColor: color,
                          backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-surface))`,
                          color: "var(--color-text)",
                          backgroundImage: cancelled
                            ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(0,0,0,0.06) 4px 5px)"
                            : undefined,
                        }}
                        title={`${formatTime(a.start_time)} · ${a.client_name} · ${a.serviceName}`}
                      >
                        <span className="font-medium">{formatTime(a.start_time)}</span>{" "}
                        <span className="text-[var(--color-text-muted)]">{a.client_name}</span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[0.625rem] sm:text-[0.6875rem] text-[var(--color-text-subtle)] px-1">
                      +{overflow} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-[0.9375rem] font-medium text-[var(--color-text)]">
            {formatDate(selectedDate, "long")}
          </h4>
          <span className="text-[0.6875rem] uppercase tracking-wider text-[var(--color-text-subtle)]">
            {dayAppointments.length} appointment{dayAppointments.length === 1 ? "" : "s"}
          </span>
        </div>
        {dayAppointments.length === 0 ? (
          <p className="text-[var(--color-text-subtle)] text-[0.8125rem] py-6 text-center">No appointments on this day.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {dayAppointments.map((a) => {
              const color = a.stylistColor || "var(--color-text-subtle)";
              return (
                <li
                  key={a.id}
                  className="py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--color-cream-50)] px-2 -mx-2 transition-colors rounded-sm"
                  onClick={() => onSelectAppointment?.(a.id)}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
                  <div className="text-[0.8125rem] text-[var(--color-text-muted)] w-20 shrink-0 tabular-nums">
                    {formatTime(a.start_time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-medium text-[var(--color-text)] truncate">{a.client_name}</p>
                    <p className="text-[0.75rem] text-[var(--color-text-muted)] truncate flex items-center gap-1.5">
                      <span className="truncate">
                        {a.serviceName} · {a.stylistName}
                      </span>
                      {a.requested_stylist === false ? (
                        <span
                          className="shrink-0 text-[0.625rem] uppercase tracking-widest font-body bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded"
                          title="Customer chose Any Stylist; system assigned"
                        >
                          Any
                        </span>
                      ) : a.requested_stylist === true ? (
                        <span
                          className="shrink-0 text-[0.625rem] uppercase tracking-widest font-body bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded"
                          title="Customer requested this stylist by name"
                        >
                          Requested
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {a.totalPriceText && (
                    <div className="text-[0.8125rem] text-[var(--color-accent-gold)] shrink-0 tabular-nums">{a.totalPriceText}</div>
                  )}
                  <Badge tone={badgeToneForStatus(a.status)} size="sm">
                    {a.status.replace("_", " ")}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
