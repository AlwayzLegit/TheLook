"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/format";
import { cn } from "@/components/ui/cn";

// Horizontal 9 am–8 pm strip showing every booking as a colored block by
// stylist (plan §6 hero row). "Now" line keeps current time visible.

interface TimelineAppt {
  id: string;
  clientName: string;
  serviceName: string;
  stylistId: string | null;
  stylistName: string;
  stylistColor: string | null;
  start: string;
  end: string;
  status: string;
  requested?: boolean;
}

const START_HOUR = 9;
const END_HOUR = 20;
const HOURS = END_HOUR - START_HOUR;

function timeToFrac(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const mins = h * 60 + m - START_HOUR * 60;
  return Math.max(0, Math.min(1, mins / (HOURS * 60)));
}

export default function TodayTimeline({ appointments }: { appointments: TimelineAppt[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const nowFrac = now
    ? timeToFrac(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`)
    : null;

  if (!appointments.length) {
    return (
      <div className="text-center py-10 border border-dashed border-[var(--color-border-strong)] rounded-md">
        <p className="text-[0.875rem] text-[var(--color-text-muted)]">No appointments on the calendar today.</p>
        <Link href="/admin/appointments" className="text-[0.75rem] text-[var(--color-crimson-600)] hover:underline">
          Open appointments →
        </Link>
      </div>
    );
  }

  // Simple row assignment — stack overlapping blocks.
  type Row = TimelineAppt[];
  const rows: Row[] = [];
  const sorted = [...appointments].sort((a, b) => a.start.localeCompare(b.start));
  for (const a of sorted) {
    let placed = false;
    for (const row of rows) {
      const last = row[row.length - 1];
      if (!last || last.end <= a.start) {
        row.push(a);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([a]);
  }
  const rowCount = Math.max(rows.length, 1);

  return (
    <div>
      {/* Hour ruler */}
      <div className="relative mb-1 ml-10" aria-hidden>
        <div className="grid text-[0.625rem] uppercase tracking-wider text-[var(--color-text-subtle)]" style={{ gridTemplateColumns: `repeat(${HOURS + 1}, 1fr)` }}>
          {Array.from({ length: HOURS + 1 }).map((_, i) => {
            const h = START_HOUR + i;
            return <span key={i} className="text-left">{h % 12 || 12}{h >= 12 ? "p" : "a"}</span>;
          })}
        </div>
      </div>

      <div ref={scrollerRef} className="relative rounded-md bg-[var(--color-cream-50)] border border-[var(--color-border)] overflow-hidden">
        {/* Hour gridlines */}
        <div className="absolute inset-0 ml-10 pointer-events-none" aria-hidden>
          {Array.from({ length: HOURS }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-[var(--color-border)]/60"
              style={{ left: `${(i / HOURS) * 100}%` }}
            />
          ))}
        </div>

        {/* Row labels on the left — one per row, keeps stylist groupings visible */}
        <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-[var(--color-border)] bg-[var(--color-cream-50)]" aria-hidden />

        {/* Now line */}
        {nowFrac != null && (
          <div className="absolute top-0 bottom-0 ml-10 z-10 pointer-events-none" style={{ left: `calc(${nowFrac * 100}% - 1px)`, width: 2 }}>
            <div className="w-[2px] h-full bg-[var(--color-crimson-600)]" />
          </div>
        )}

        {/* Rows of blocks */}
        <div className="ml-10 p-2 space-y-1.5" style={{ minHeight: rowCount * 40 + 16 }}>
          {rows.map((row, i) => (
            <div key={i} className="relative h-9">
              {row.map((a) => {
                const left = timeToFrac(a.start) * 100;
                const right = timeToFrac(a.end) * 100;
                const width = Math.max(right - left, 2);
                const cancelled = a.status === "cancelled";
                const noShow = a.status === "no_show";
                return (
                  <Link
                    key={a.id}
                    href={`/admin/appointments?focus=${a.id}`}
                    className={cn(
                      "absolute inset-y-0 rounded-sm overflow-hidden text-[0.6875rem] leading-tight flex flex-col justify-center px-2 whitespace-nowrap transition-opacity",
                      cancelled && "opacity-50",
                      noShow && "opacity-40",
                    )}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: a.stylistColor
                        ? `${a.stylistColor}22`
                        : "var(--color-cream-200)",
                      borderLeft: `3px solid ${a.stylistColor || "var(--color-text-subtle)"}`,
                    }}
                    title={`${a.clientName} · ${a.serviceName} · ${formatTime(a.start)}–${formatTime(a.end)}`}
                  >
                    <span className="truncate text-[var(--color-text)]">
                      {formatTime(a.start)} {a.clientName}
                      {cancelled && " · cancelled"}
                      {noShow && " · no-show"}
                    </span>
                    <span className="truncate text-[var(--color-text-muted)]">{a.serviceName}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
