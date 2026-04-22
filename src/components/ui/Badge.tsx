import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"        // crimson
  | "gold";

type Size = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
  dot?: boolean;
}

// Status pill — used for booking statuses (confirmed / pending / cancelled /
// completed / no-show / archived), user roles, active toggles, anywhere a
// compact, typed label belongs. Every tone is token-driven so restyling is a
// one-file swap.
const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-[var(--color-cream-200)]/70 text-[var(--color-text-muted)]",
  success: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  danger:  "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  info:    "bg-[var(--color-info)]/12 text-[var(--color-info)]",
  accent:  "bg-[var(--color-crimson-600)]/12 text-[var(--color-crimson-600)]",
  gold:    "bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-[0.6875rem] px-1.5 py-0.5",
  md: "text-[0.75rem] px-2 py-0.5",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = "neutral", size = "sm", dot, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium tracking-[0.02em] whitespace-nowrap",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
});

// Convenience — status → tone map. Import + call in every list / detail so
// every status renders identically across the admin. Unknown statuses
// fall back to neutral.
export function badgeToneForStatus(status: string | null | undefined): Tone {
  switch ((status || "").toLowerCase()) {
    case "confirmed":  return "success";
    case "pending":    return "gold";
    case "completed":  return "info";
    case "cancelled":  return "danger";
    case "no_show":    return "warning";
    case "archived":   return "neutral";
    case "active":     return "success";
    case "inactive":   return "neutral";
    case "admin":      return "accent";
    case "stylist":    return "info";
    case "vip":        return "gold";
    default: return "neutral";
  }
}
