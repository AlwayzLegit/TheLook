"use client";

import Link, { type LinkProps } from "next/link";
import { type ReactNode, type MouseEvent, type CSSProperties } from "react";
import { track } from "@/lib/analytics";

// Thin wrapper around next/link that fires a PostHog event when the
// user clicks the CTA. Used for "Book Now" / "Call" / "Directions"
// buttons so the admin dashboard can break conversions down by which
// surface the click came from (mobile-sticky vs hero vs neighborhood-
// page vs service-page, etc.).
//
// Tracking is fire-and-forget (analytics.track() swallows any errors)
// and runs before the navigation begins — posthog-js batches events
// to its sendBeacon endpoint so the navigation isn't delayed.
//
// Falls back gracefully when PostHog isn't initialised — the Link
// behaves like a regular <Link> for everyone (preview envs, ad-block
// users, no-script users).

type Props = Omit<LinkProps, "onClick"> & {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  event: string;
  properties?: Record<string, string | number | boolean | null | undefined>;
  // Some callers (mobile nav close handler, modal dismiss) need their
  // own onClick alongside the analytics fire. Chain it so both run
  // before the navigation completes.
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  style?: CSSProperties;
};

export function TrackedLink({
  event,
  properties,
  children,
  className,
  ariaLabel,
  onClick: extraOnClick,
  style,
  ...linkProps
}: Props) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    track(event, properties);
    extraOnClick?.(e);
  };
  return (
    <Link
      {...linkProps}
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
      style={style}
    >
      {children}
    </Link>
  );
}

// Anchor-tag variant for tel: / mailto: / external URLs that next/link
// shouldn't intercept.
export function TrackedAnchor({
  event,
  properties,
  href,
  children,
  className,
  ariaLabel,
  target,
  rel,
}: {
  event: string;
  properties?: Record<string, string | number | boolean | null | undefined>;
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  target?: string;
  rel?: string;
}) {
  const onClick = () => track(event, properties);
  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      target={target}
      rel={rel}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
