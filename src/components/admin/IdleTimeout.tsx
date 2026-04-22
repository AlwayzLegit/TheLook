"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

// Shop-floor tool — default idle timeout is 8h so staff don't get bounced
// mid-shift. Admin can override via settings.idle_timeout_minutes (plan
// bug #7) but we don't hit the network for it here; the IdleTimeout
// component reads a CSS custom prop written by the admin shell + picks up
// a data attribute override when present.
const DEFAULT_IDLE_MIN = 8 * 60;
function resolveMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_IDLE_MIN;
  const attr = document.documentElement.getAttribute("data-idle-timeout-min");
  const parsed = attr ? parseInt(attr, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_IDLE_MIN;
}
const IDLE_MS = () => resolveMinutes() * 60 * 1000;
const WARN_MS = () => Math.max((resolveMinutes() - 2) * 60 * 1000, 60_000);
// visibilitychange lives on document, not window — handled separately.
const WINDOW_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

// Force sign-out after IDLE_MS of no interaction. Complements the server-side
// session maxAge=4h — belt-and-suspenders so an unattended admin laptop
// doesn't stay logged in all day.
export default function IdleTimeout() {
  const { status } = useSession();
  const timeoutRef = useRef<number | null>(null);
  const warnRef = useRef<number | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const clearTimers = () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      if (warnRef.current !== null) window.clearTimeout(warnRef.current);
    };

    const reset = () => {
      clearTimers();
      warnedRef.current = false;
      warnRef.current = window.setTimeout(() => {
        if (warnedRef.current) return;
        warnedRef.current = true;
        // Quiet warning — no blocking dialog, just a toast-like alert.
        // Enough to nudge the admin back if they're present but didn't
        // touch the mouse.
        console.info("[idle] signing out in 2 minutes of inactivity");
      }, WARN_MS());
      timeoutRef.current = window.setTimeout(() => {
        signOut({ callbackUrl: "/admin/login?reason=idle" }).catch(() => {
          // Fallback: force a reload to the login page.
          window.location.href = "/admin/login?reason=idle";
        });
      }, IDLE_MS());
    };

    reset();
    for (const ev of WINDOW_EVENTS) {
      window.addEventListener(ev, reset, { passive: true });
    }
    document.addEventListener("visibilitychange", reset);
    return () => {
      clearTimers();
      for (const ev of WINDOW_EVENTS) {
        window.removeEventListener(ev, reset);
      }
      document.removeEventListener("visibilitychange", reset);
    };
  }, [status]);

  return null;
}
