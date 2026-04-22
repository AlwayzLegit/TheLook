import type { ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

// Shared empty-state template. Replaces every "No ___ yet." single-liner.
export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center border border-dashed border-[var(--color-border-strong)] rounded-lg bg-[var(--color-cream-50)]",
        compact ? "px-6 py-8" : "px-8 py-14",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-cream-200)]/60 text-[var(--color-text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="font-heading text-[1.125rem] text-[var(--color-text)] mb-1.5">{title}</h3>
      {description && <p className="text-[0.8125rem] text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-5 flex items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
