"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface Props {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
}

// Imperative handle so parents can call `ref.current?.reset()` after a
// failed submit. Cloudflare invalidates single-use tokens; without a
// reset the second attempt always fails with `invalid-input-response`.
export interface TurnstileHandle {
  reset: () => void;
}

const TurnstileField = forwardRef<TurnstileHandle, Props>(function TurnstileField(
  { siteKey, onTokenChange },
  ref,
) {
  const divId = `turnstile-${useId().replace(/[:]/g, "")}`;
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      if (cancelled) return;
      if (!window.turnstile) {
        setTimeout(mount, 150);
        return;
      }
      if (widgetIdRef.current) return;
      const el = document.getElementById(divId);
      if (!el) return;
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(null),
        "error-callback": () => onTokenChange(null),
      });
    };

    mount();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [divId, siteKey, onTokenChange]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile?.reset) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          onTokenChange(null);
        } catch {
          // ignore — caller will just see a fresh challenge next mount
        }
      }
    },
  }), [onTokenChange]);

  return <div id={divId} />;
});

export default TurnstileField;
