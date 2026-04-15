"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const shortcuts = [
  { key: "d", path: "/admin", label: "Dashboard" },
  { key: "a", path: "/admin/appointments", label: "Appointments" },
  { key: "m", path: "/admin/messages", label: "Messages" },
  { key: "s", path: "/admin/services", label: "Services" },
  { key: "t", path: "/admin/stylists", label: "Stylists" },
  { key: "h", path: "/admin/schedule", label: "Schedule" },
];

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ctrl+K or Cmd+K → show shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape → close any modal / help
      if (e.key === "Escape") {
        setShowHelp(false);
        return;
      }

      // Alt+key shortcuts for navigation
      if (e.altKey) {
        const match = shortcuts.find((s) => s.key === e.key.toLowerCase());
        if (match) {
          e.preventDefault();
          router.push(match.path);
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
      <div className="bg-white p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg">Keyboard Shortcuts</h3>
          <span className="text-xs font-body text-navy/40">Ctrl+K to toggle</span>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1">
              <span className="text-sm font-body text-navy/70">{s.label}</span>
              <kbd className="text-xs font-mono bg-navy/5 border border-navy/10 px-2 py-0.5 rounded">
                Alt+{s.key.toUpperCase()}
              </kbd>
            </div>
          ))}
          <div className="border-t border-navy/10 pt-2 mt-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-body text-navy/70">Close modals</span>
              <kbd className="text-xs font-mono bg-navy/5 border border-navy/10 px-2 py-0.5 rounded">Esc</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-body text-navy/70">This help</span>
              <kbd className="text-xs font-mono bg-navy/5 border border-navy/10 px-2 py-0.5 rounded">Ctrl+K</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
