"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "./cn";

// Themed wrapper around Radix DropdownMenu. Used for kebab row actions +
// the user menu in the top bar. Keeps the class sprawl out of calling code.

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 4, align = "end", ...rest }, ref) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]",
          "shadow-[var(--shadow-raised)] p-1 text-[0.8125rem]",
          "data-[state=open]:animate-[admin-scale-in_140ms_ease]",
          "data-[state=closed]:animate-[admin-scale-out_120ms_ease]",
          className,
        )}
        {...rest}
      />
    </DropdownPrimitive.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { danger?: boolean }
>(function DropdownMenuItem({ className, danger, ...rest }, ref) {
  return (
    <DropdownPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 outline-none transition-colors",
        danger
          ? "text-[var(--color-danger)] focus:bg-[var(--color-danger)]/10"
          : "text-[var(--color-text)] focus:bg-[var(--color-cream-200)]/60",
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  );
});

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(function DropdownMenuLabel({ className, ...rest }, ref) {
  return (
    <DropdownPrimitive.Label
      ref={ref}
      className={cn(
        "px-2.5 py-1.5 text-[0.7rem] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]",
        className,
      )}
      {...rest}
    />
  );
});

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...rest }, ref) {
  return (
    <DropdownPrimitive.Separator
      ref={ref}
      className={cn("my-1 h-px bg-[var(--color-border)]", className)}
      {...rest}
    />
  );
});
