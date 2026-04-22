import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// Tag — for service chips, stylist specialties, client tags. Reads the
// stylist's color dot when one is passed (used on Appointments list to
// colour-hint which stylist each row belongs to).

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string; // hex from stylist.color or chart palette
  removable?: boolean;
  onRemove?: () => void;
  leading?: ReactNode;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { color, removable, onRemove, leading, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-cream-50)] px-2 py-0.5 text-[0.75rem] text-[var(--color-text-muted)] whitespace-nowrap",
        className,
      )}
      {...rest}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      {leading}
      <span className="truncate max-w-[14rem]">{children}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="rounded-full text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
          aria-label="Remove"
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l6 6M2 8l6-6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
});

// Parse a JSON array string or a comma-separated list of specialties and
// return a clean string[]. Covers the three historical formats we've seen
// in production data (plan bug #1).
export function parseSpecialties(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // fall through
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
