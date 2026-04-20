"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  appointmentId: string | null;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsBell({ enabled = true }: { enabled?: boolean }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await fetch("/api/admin/notifications?limit=30");
      if (!r.ok) return;
      const data = await r.json();
      setItems(data.items || []);
      setUnread(data.unreadCount || 0);
    } catch {
      // ignore
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, [enabled, load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    load();
  };

  const markOne = async (id: string) => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  if (!enabled) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center text-white/70 hover:text-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-rose text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          {/* Invisible click-catcher behind the panel on mobile so taps
              outside still close it (the useRef mousedown handler above
              handles desktop clicks but a fixed-positioned panel can
              escape its parent's click-outside detection). */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="
              fixed sm:absolute
              top-14 sm:top-auto
              sm:mt-2
              right-2 sm:right-0
              left-2 sm:left-auto
              sm:w-[360px]
              max-w-[calc(100vw-1rem)]
              bg-white shadow-2xl border border-navy/10 z-50
            "
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy/10">
              <p className="font-heading text-sm">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-rose font-body hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[70vh] sm:max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-navy/40 text-sm font-body p-6 text-center">No notifications.</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div
                    onClick={() => !n.readAt && markOne(n.id)}
                    className={`px-4 py-3 border-b border-navy/5 cursor-pointer hover:bg-cream/40 transition-colors ${
                      !n.readAt ? "bg-rose/5" : ""
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <p className={`text-sm font-body ${!n.readAt ? "font-semibold text-navy" : "text-navy/80"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-navy/40 font-body shrink-0 mt-0.5">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    {n.body && <p className="text-xs text-navy/60 font-body mt-1">{n.body}</p>}
                  </div>
                );
                return n.url ? (
                  <Link key={n.id} href={n.url} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
