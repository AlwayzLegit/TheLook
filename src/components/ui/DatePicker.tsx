"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { FieldShell } from "./Input";
import { cn } from "./cn";

// Custom date + time pickers — replaces every native <input type="date">
// / <input type="time"> so the look is consistent across the admin and we
// don't inherit whatever the browser ships.

// ────────── DatePicker ──────────
interface DatePickerProps {
  value?: string | Date | null;
  onChange: (isoDate: string) => void; // YYYY-MM-DD
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
  className?: string;
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return parse(v, "yyyy-MM-dd", new Date());
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function DatePicker({
  value,
  onChange,
  label,
  hint,
  error,
  required,
  disabled,
  placeholder = "Select a date",
  minDate,
  maxDate,
  id,
  className,
}: DatePickerProps) {
  const selected = toDate(value);
  const [viewMonth, setViewMonth] = useState<Date>(selected || new Date());
  const [open, setOpen] = useState(false);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const out: Date[][] = [];
    let current = start;
    while (current <= end) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(current);
        current = new Date(current.getTime() + 86_400_000);
      }
      out.push(row);
    }
    return out;
  }, [viewMonth]);

  const isDisabled = (d: Date) => {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            id={id}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-left text-[0.8125rem]",
              "hover:border-[var(--color-text-muted)] transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error && "border-[var(--color-danger)]",
              !selected && "text-[var(--color-text-subtle)]",
            )}
          >
            <span>{selected ? format(selected, "EEE, MMM d, yyyy") : placeholder}</span>
            <svg className="h-4 w-4 text-[var(--color-text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-raised)] data-[state=open]:animate-[admin-scale-in_140ms_ease]"
          >
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))} className="rounded-sm p-1 hover:bg-[var(--color-cream-200)]/60" aria-label="Previous month">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <span className="text-[0.8125rem] font-medium">{format(viewMonth, "MMMM yyyy")}</span>
              <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))} className="rounded-sm p-1 hover:bg-[var(--color-cream-200)]/60" aria-label="Next month">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-px text-center text-[0.6875rem] uppercase tracking-wider text-[var(--color-text-subtle)] mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {weeks.flat().map((d, i) => {
                const inMonth = isSameMonth(d, viewMonth);
                const isSel = selected && isSameDay(d, selected);
                const disable = isDisabled(d);
                const today = isSameDay(d, new Date());
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disable}
                    onClick={() => {
                      onChange(format(d, "yyyy-MM-dd"));
                      setOpen(false);
                    }}
                    className={cn(
                      "h-8 w-8 rounded-sm text-[0.8125rem] transition-colors",
                      !inMonth && "text-[var(--color-text-subtle)]/40",
                      inMonth && !isSel && "hover:bg-[var(--color-cream-200)]/60",
                      today && !isSel && "ring-1 ring-[var(--color-crimson-600)]/40",
                      isSel && "bg-[var(--color-crimson-600)] text-white",
                      disable && "opacity-30 cursor-not-allowed hover:bg-transparent",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldShell>
  );
}

// ────────── TimePicker ──────────
// 30-minute granularity by default (matches BOOKING.SLOT_INCREMENT_MINUTES).
// Presents 12-hour labels but emits 24-hour HH:MM values to the caller.
interface TimePickerProps {
  value?: string | null;
  onChange: (hhmm: string) => void;
  // Caller passes "HH:MM" strings (24h) it wants to show; when omitted the
  // picker falls back to every 30-min slot from 08:00–20:00.
  options?: string[];
  stepMinutes?: number;
  startHour?: number;
  endHour?: number;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}

function defaultSlots(step: number, startHour: number, endHour: number): string[] {
  const out: string[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += step) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`);
  }
  return out;
}

function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function TimePicker({
  value,
  onChange,
  options,
  stepMinutes = 30,
  startHour = 8,
  endHour = 20,
  label,
  hint,
  error,
  required,
  disabled,
  placeholder = "Select a time",
  id,
  className,
}: TimePickerProps) {
  const slots = useMemo(
    () => (options && options.length > 0 ? options : defaultSlots(stepMinutes, startHour, endHour)),
    [options, stepMinutes, startHour, endHour],
  );
  const [open, setOpen] = useState(false);

  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            id={id}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-left text-[0.8125rem]",
              "hover:border-[var(--color-text-muted)] transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error && "border-[var(--color-danger)]",
              !value && "text-[var(--color-text-subtle)]",
            )}
          >
            <span>{value ? prettyTime(value) : placeholder}</span>
            <svg className="h-4 w-4 text-[var(--color-text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-raised)] w-40 max-h-72 overflow-y-auto data-[state=open]:animate-[admin-scale-in_140ms_ease]"
          >
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                className={cn(
                  "block w-full rounded-sm px-3 py-1.5 text-left text-[0.8125rem] transition-colors",
                  value === s
                    ? "bg-[var(--color-crimson-600)] text-white"
                    : "hover:bg-[var(--color-cream-200)]/60",
                )}
              >
                {prettyTime(s)}
              </button>
            ))}
            {slots.length === 0 && (
              <p className="px-3 py-2 text-[0.75rem] text-[var(--color-text-subtle)]">No slots available</p>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldShell>
  );
}

// ────────── DateRangePicker (compact single popover) ──────────
// Wraps two DatePickers in a single field shell. Used for Analytics +
// Commissions date range. Emits { from, to } as YYYY-MM-DD strings.
interface DateRangePickerProps {
  from?: string | null;
  to?: string | null;
  onChange: (range: { from: string | null; to: string | null }) => void;
  label?: string;
  presets?: Array<{ label: string; from: string; to: string }>;
  className?: string;
}

export function DateRangePicker({ from, to, onChange, label, presets, className }: DateRangePickerProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {label && <div className="col-span-2 text-[0.75rem] font-medium text-[var(--color-text-muted)]">{label}</div>}
      <DatePicker
        value={from || null}
        onChange={(d) => onChange({ from: d, to: to || null })}
        placeholder="From"
      />
      <DatePicker
        value={to || null}
        onChange={(d) => onChange({ from: from || null, to: d })}
        placeholder="To"
        minDate={from ? new Date(`${from}T12:00:00`) : undefined}
      />
      {presets && presets.length > 0 && (
        <div className="col-span-2 flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ from: p.from, to: p.to })}
              className="rounded-sm border border-[var(--color-border)] px-2 py-1 text-[0.6875rem] uppercase tracking-wide text-[var(--color-text-muted)] hover:bg-[var(--color-cream-200)]/60"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
