"use client";

import { useEffect, useId, useRef } from "react";

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
    };
  }
}

interface Props {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
}

export default function TurnstileField({ siteKey, onTokenChange }: Props) {
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

  return <div id={divId} />;
}

