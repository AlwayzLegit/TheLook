"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

// Default idle timeout is 3h 45m so the client-side timer always trips
// before the NextAuth JWT maxAge (4h) — otherwise the admin clicks once
// more after the server session expired and silently gets bounced with a
// redirect loop. Admin can raise via settings.idle_timeout_minutes but
// it's capped server-side at 235 to preserve the invariant.
const DEFAULT_IDLE_MIN = 225;
const MAX_IDLE_MIN = 235;
function resolveMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_IDLE_MIN;
  const attr = document.documentElement.getAttribute("data-idle-timeout-min");
  const parsed = attr ? parseInt(attr, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_IDLE_MIN;
  return Math.min(parsed, MAX_IDLE_MIN);
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
        // Silent marker — console logging here leaked "admin is idle" to
        // anyone peeking at devtools. The window.setTimeout below still
        // fires the actual sign-out; the warn slot exists to hook a
        // toast later if we want one.
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
