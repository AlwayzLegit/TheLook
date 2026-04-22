import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// Card — the one container every admin surface sits inside. Supports an
// optional header + footer for repeated layouts without reinventing.

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  raised?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, padded = true, raised, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg",
        raised ? "shadow-[var(--shadow-raised)]" : "shadow-[var(--shadow-card)]",
        padded && "p-5",
        className,
      )}
      {...rest}
    />
  );
});

interface SectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, SectionProps>(function CardHeader(
  { className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("px-5 py-4 border-b border-[var(--color-border)] flex items-start justify-between gap-4", className)}
      {...rest}
    />
  );
});

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, ...rest },
  ref,
) {
  return <h3 ref={ref} className={cn("text-[1.0625rem] font-medium text-[var(--color-text)] leading-tight", className)} {...rest} />;
});

export const CardSubtitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(function CardSubtitle(
  { className, ...rest },
  ref,
) {
  return <p ref={ref} className={cn("text-[0.75rem] text-[var(--color-text-muted)] mt-0.5", className)} {...rest} />;
});

export const CardBody = forwardRef<HTMLDivElement, SectionProps>(function CardBody(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cn("px-5 py-4", className)} {...rest} />;
});

export const CardFooter = forwardRef<HTMLDivElement, SectionProps>(function CardFooter(
  { className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-cream-50)] rounded-b-lg flex items-center gap-2",
        className,
      )}
      {...rest}
    />
  );
});

// Eyebrow — small tracked uppercase label pattern used over section titles.
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[0.6875rem] uppercase tracking-[0.15em] text-[var(--color-accent-gold)]", className)}>
      {children}
    </p>
  );
}
