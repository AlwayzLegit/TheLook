"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "./cn";

// One Tabs style, used everywhere — Appointments (Calendar/List),
// Client detail, Settings sub-nav, etc.

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...rest }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 border-b border-[var(--color-border)]",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...rest }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative px-3 py-2 text-[0.8125rem] text-[var(--color-text-muted)] transition-colors",
        "data-[state=active]:text-[var(--color-text)]",
        "hover:text-[var(--color-text)]",
        "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-transparent",
        "data-[state=active]:after:bg-[var(--color-crimson-600)]",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...rest }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn("py-6 focus:outline-none", className)} {...rest} />;
});

// Segmented (pill-group) — matches the Calendar/List toggle on Appointments.
// Sibling API to Tabs so the same state primitive powers both looks.

export const Segmented = TabsPrimitive.Root;

export const SegmentedList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function SegmentedList({ className, ...rest }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-cream-50)]",
        className,
      )}
      {...rest}
    />
  );
});

export const SegmentedItem = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function SegmentedItem({ className, ...rest }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "px-3 py-1.5 text-[0.75rem] uppercase tracking-[0.1em] rounded-sm transition-colors",
        "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text)] data-[state=active]:shadow-sm",
        className,
      )}
      {...rest}
    />
  );
});
