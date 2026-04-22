"use client";

import { createContext, useContext, type ReactNode } from "react";
import { brandingDefaults, type Branding } from "@/lib/branding";

// Client-side branding context. Hydrated once at the root layout from a
// server-side getBranding() fetch and then read everywhere via useBranding().
// Defaults to the static strings.ts fallbacks so tests / storybook / any
// consumer without a provider still renders.
const BrandingContext = createContext<Branding>(brandingDefaults);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: Branding;
  children: ReactNode;
}) {
  return (
    <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
