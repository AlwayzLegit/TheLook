"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "./cn";

// ────── Checkbox ──────
interface CheckboxProps extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: ReactNode;
  hint?: ReactNode;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { label, hint, id, className, ...rest },
  ref,
) {
  const inputId = id || (typeof label === "string" ? `cb-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const box = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={inputId}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)]",
        "data-[state=checked]:bg-[var(--color-crimson-600)] data-[state=checked]:border-[var(--color-crimson-600)]",
        "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2.5 6.5L5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label) return box;
  return (
    <label htmlFor={inputId} className="flex items-start gap-2 cursor-pointer select-none">
      <span className="pt-0.5">{box}</span>
      <span>
        <span className="block text-[0.8125rem] text-[var(--color-text)]">{label}</span>
        {hint && <span className="block text-[0.75rem] text-[var(--color-text-subtle)]">{hint}</span>}
      </span>
    </label>
  );
});

// ────── Switch ──────
interface SwitchProps extends ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: ReactNode;
  hint?: ReactNode;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { label, hint, id, className, ...rest },
  ref,
) {
  const inputId = id || (typeof label === "string" ? `sw-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const toggle = (
    <SwitchPrimitive.Root
      ref={ref}
      id={inputId}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        "bg-[var(--color-border-strong)] data-[state=checked]:bg-[var(--color-crimson-600)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform translate-x-0.5 data-[state=checked]:translate-x-[1.125rem]" />
    </SwitchPrimitive.Root>
  );

  if (!label) return toggle;
  return (
    <label htmlFor={inputId} className="flex items-center gap-3 cursor-pointer select-none">
      <div>
        <div className="text-[0.8125rem] text-[var(--color-text)]">{label}</div>
        {hint && <div className="text-[0.75rem] text-[var(--color-text-subtle)] mt-0.5">{hint}</div>}
      </div>
      <span className="ml-auto">{toggle}</span>
    </label>
  );
});
