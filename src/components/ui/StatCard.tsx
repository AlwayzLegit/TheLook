import type { ReactNode } from "react";
import { cn } from "./cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: number | null; // +/- % vs prior period
  deltaLabel?: string;
  sparkline?: ReactNode;
  hint?: ReactNode;
  className?: string;
  href?: string;
}

// Dashboard + Analytics KPI tile. Value on top, label beneath it (per plan
// §8.1). Optional delta pill and optional sparkline slot.
export function StatCard({ label, value, delta, deltaLabel, sparkline, hint, className, href }: StatCardProps) {
  const positive = typeof delta === "number" && delta > 0;
  const negative = typeof delta === "number" && delta < 0;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-[var(--font-display)] text-[2.125rem] leading-none text-[var(--color-text)] tracking-tight">
            {value}
          </div>
          <div className="mt-2 text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">{label}</div>
        </div>
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
              positive && "bg-[var(--color-success)]/12 text-[var(--color-success)]",
              negative && "bg-[var(--color-danger)]/12 text-[var(--color-danger)]",
              !positive && !negative && "bg-[var(--color-cream-200)]/60 text-[var(--color-text-muted)]",
            )}
            title={deltaLabel}
          >
            {positive ? "▲" : negative ? "▼" : "—"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {sparkline && <div className="mt-4 h-8 -mx-1">{sparkline}</div>}
      {hint && <p className="mt-2 text-[0.75rem] text-[var(--color-text-subtle)]">{hint}</p>}
    </>
  );
  const base =
    "block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 shadow-[var(--shadow-card)] transition-colors";
  if (href) {
    return (
      <a href={href} className={cn(base, "hover:border-[var(--color-border-strong)]", className)}>
        {inner}
      </a>
    );
  }
  return <div className={cn(base, className)}>{inner}</div>;
}
