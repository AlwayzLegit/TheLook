"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  // When set, renders a Radix Slot so the child element (usually a Link)
  // receives the button classes. Used for nav buttons that should keep
  // next/link's client-side transitions.
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--color-crimson-600)] text-[var(--color-text-inverse)] hover:bg-[var(--color-crimson-700)] shadow-[var(--shadow-card)] border border-[var(--color-crimson-700)]/30",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-cream-50)]",
  ghost:
    "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-cream-200)]/50 border border-transparent",
  danger:
    "bg-[var(--color-danger)] text-[var(--color-text-inverse)] hover:brightness-110 border border-[var(--color-danger)]/30",
  link:
    "bg-transparent text-[var(--color-crimson-600)] hover:text-[var(--color-crimson-700)] underline-offset-4 hover:underline border border-transparent",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
  md: "h-10 px-4 text-[0.8125rem] gap-2",
  lg: "h-12 px-6 text-[0.9375rem] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, asChild, children, leftIcon, rightIcon, disabled, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref as never}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium tracking-[0.02em]",
        "transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        "whitespace-nowrap select-none",
        sizeClass[size],
        variantClass[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </Comp>
  );
});

// IconButton — single-icon action; always square, visually balanced for
// kebab menus + toolbars + the top bar.
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", className, ...rest },
  ref,
) {
  const sizeCls = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeCls,
        variantClass[variant],
        className,
      )}
      {...rest}
    />
  );
});
