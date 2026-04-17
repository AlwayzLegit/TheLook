"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function AvailabilityWidget() {
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/availability-next")
      .then((r) => r.json())
      .then((data) => {
        if (data.nextSlot) {
          setSlot(data.nextSlot);
          setTimeout(() => setVisible(true), 1500);
        }
      })
      .catch(() => {});
  }, []);

  if (!slot || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-xs hidden lg:block animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-navy/10 shadow-xl rounded-lg p-4 relative">
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="absolute top-2 right-2 text-navy/30 hover:text-navy/60 text-lg leading-none"
        >
          ×
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[10px] font-body text-green-600 tracking-wider uppercase">Slot Available</p>
        </div>
        <p className="font-heading text-sm mb-1">Next opening</p>
        <p className="text-navy/70 text-sm font-body">
          {formatDate(slot.date)} at {formatTime(slot.time)}
        </p>
        <Link
          href="/book"
          className="mt-3 block text-center bg-rose hover:bg-rose-light text-white text-[10px] tracking-[0.2em] uppercase px-4 py-2 font-body transition-all"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
