import type { HTMLAttributes } from "react";
import { cn } from "./cn";

// Replaces plain "Loading..." text. Caller sets width/height via className.
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-[var(--color-cream-200)]/60 animate-pulse",
        className,
      )}
      {...rest}
    />
  );
}

// Pre-baked row skeleton for table placeholders.
export function SkeletonRow({ cols = 4, className }: { cols?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-40" : "w-20", i === cols - 1 && "ml-auto")} />
      ))}
    </div>
  );
}
