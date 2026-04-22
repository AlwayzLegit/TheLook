"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// Shared look for every form control. Uses the token system + keeps the
// cream/navy aesthetic consistent across all inputs.
const FIELD_BASE =
  "block w-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] rounded-md px-3 text-[0.8125rem] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-crimson-600)] disabled:opacity-60 disabled:bg-[var(--color-cream-50)] transition-colors";

const FIELD_ERROR = "border-[var(--color-danger)] focus:border-[var(--color-danger)]";

// ────── FieldShell ──────
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function FieldShell({ label, hint, error, required, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[0.75rem] font-medium text-[var(--color-text-muted)] tracking-wide">
          {label}
          {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[0.75rem] text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="text-[0.75rem] text-[var(--color-text-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}

// ────── Input ──────
// Omit native `prefix` (global HTML string attribute — nobody uses it) so
// we can repurpose the prop name for our leading adornment.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  fieldClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, id, className, prefix, suffix, fieldClassName, ...rest },
  ref,
) {
  const inputId = id || (label ? `in-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const inputEl = (
    <input
      ref={ref}
      id={inputId}
      required={required}
      className={cn(FIELD_BASE, "h-10", error && FIELD_ERROR, className)}
      {...rest}
    />
  );
  if (!prefix && !suffix) {
    return (
      <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId} className={fieldClassName}>
        {inputEl}
      </FieldShell>
    );
  }
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId} className={fieldClassName}>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-[var(--color-text-subtle)] pointer-events-none flex items-center">{prefix}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn(FIELD_BASE, "h-10", prefix && "pl-9", suffix && "pr-9", error && FIELD_ERROR, className)}
          {...rest}
        />
        {suffix && <span className="absolute right-3 text-[var(--color-text-subtle)] pointer-events-none">{suffix}</span>}
      </div>
    </FieldShell>
  );
});

// ────── Textarea ──────
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, id, className, rows = 3, ...rest },
  ref,
) {
  const inputId = id || (label ? `ta-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        className={cn(FIELD_BASE, "py-2 resize-y", error && FIELD_ERROR, className)}
        {...rest}
      />
    </FieldShell>
  );
});

// ────── Select (native-HTML wrapper — keeps native keyboard / mobile UX) ──────
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, id, className, children, ...rest },
  ref,
) {
  const inputId = id || (label ? `sel-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          required={required}
          className={cn(FIELD_BASE, "h-10 appearance-none pr-9", error && FIELD_ERROR, className)}
          {...rest}
        >
          {children}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </FieldShell>
  );
});
