"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "./cn";

// Shared Overlay — used by both Modal (centred) and Sheet (right-side).
const Overlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function Overlay({ className, ...rest }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-[var(--color-navy-950)]/50 backdrop-blur-[2px]",
        "data-[state=open]:animate-admin-fade-in data-[state=closed]:animate-admin-fade-out",
        className,
      )}
      {...rest}
    />
  );
});

// ────────── Modal (centred dialog) ──────────
// Use for small, focused confirmations. For data entry / long forms, use <Sheet>.
interface ModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  // Optional controlled trigger — use Modal.Trigger when the caller wants
  // Radix to manage open state (uncontrolled).
  trigger?: ReactNode;
}

const modalSize = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onOpenChange, title, description, children, footer, size = "md", trigger }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <Overlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-sheet)]",
            "data-[state=open]:animate-[admin-scale-in_180ms_ease]",
            "data-[state=closed]:animate-[admin-scale-out_150ms_ease]",
            "focus:outline-none",
            modalSize[size],
          )}
        >
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <DialogPrimitive.Title className="text-[1.0625rem] font-medium text-[var(--color-text)]">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-[0.8125rem] text-[var(--color-text-muted)] mt-1">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-cream-50)] rounded-b-lg flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
          <DialogPrimitive.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-cream-200)]/60 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              </svg>
            </button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ────────── Sheet (right-side slide-over) ──────────
// The preferred container for edit / detail forms. Sticky header + footer
// keeps Save / Cancel always visible on long forms.
interface SheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  side?: "right" | "left";
}

const sheetSize = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

export function Sheet({ open, onOpenChange, title, description, children, footer, size = "md", side = "right" }: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <Overlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 bottom-0 z-50 flex flex-col w-full",
            side === "right" ? "right-0" : "left-0",
            "bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-[var(--shadow-sheet)]",
            side === "right"
              ? "data-[state=open]:animate-[admin-slide-in-right_220ms_ease] data-[state=closed]:animate-[admin-slide-out-right_180ms_ease]"
              : "",
            "focus:outline-none",
            sheetSize[size],
          )}
        >
          <div className="flex-none px-6 py-5 border-b border-[var(--color-border)] flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-[1.125rem] font-medium text-[var(--color-text)] truncate">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-[0.8125rem] text-[var(--color-text-muted)] mt-1">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                aria-label="Close"
                className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-cream-200)]/60 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex-none px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-cream-50)] flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
