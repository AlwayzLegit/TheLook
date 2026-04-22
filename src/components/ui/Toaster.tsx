"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

// Single toaster instance mounted at the root of the admin shell. Re-export
// `toast` so consumers don't reach into sonner directly (keeps the import
// surface tiny if we ever swap implementations).

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-raised)] text-[var(--color-text)]",
          title: "text-[0.8125rem] font-medium",
          description: "text-[0.75rem] text-[var(--color-text-muted)]",
          success: "[&_[data-icon]]:text-[var(--color-success)]",
          error: "[&_[data-icon]]:text-[var(--color-danger)]",
          warning: "[&_[data-icon]]:text-[var(--color-warning)]",
          info: "[&_[data-icon]]:text-[var(--color-info)]",
        },
      }}
    />
  );
}

export const toast = sonnerToast;
