"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { displayEmail, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/components/ui/cn";

// Global ⌘K command palette. Mounted once at the admin shell. Searches
// clients, appointments, services + has a built-in list of admin pages so
// staff can jump anywhere with the keyboard.

interface SearchHit {
  clients: Array<{ email: string; name: string; phone: string | null; banned?: boolean }>;
  appointments: Array<{ id: string; client_name: string; client_email: string; date: string; start_time: string; status: string }>;
  services: Array<{ id: string; name: string; category: string; price_text: string; slug?: string | null }>;
}

const PAGES: Array<{ label: string; href: string; group: string }> = [
  { label: "Dashboard",        href: "/admin",              group: "Navigate" },
  { label: "Appointments",     href: "/admin/appointments", group: "Navigate" },
  { label: "Schedule",         href: "/admin/schedule",     group: "Navigate" },
  { label: "Waitlist",         href: "/admin/waitlist",     group: "Navigate" },
  { label: "Clients",          href: "/admin/clients",      group: "Navigate" },
  { label: "Stylists",         href: "/admin/stylists",     group: "Navigate" },
  { label: "Users",            href: "/admin/users",        group: "Navigate" },
  { label: "Services",         href: "/admin/services",     group: "Navigate" },
  { label: "Inventory",        href: "/admin/products",     group: "Navigate" },
  { label: "Discounts",        href: "/admin/discounts",    group: "Navigate" },
  { label: "Commissions",      href: "/admin/commissions",  group: "Navigate" },
  { label: "Messages",         href: "/admin/messages",     group: "Navigate" },
  { label: "Reviews",          href: "/admin/reviews",      group: "Navigate" },
  { label: "Analytics",        href: "/admin/analytics",    group: "Navigate" },
  { label: "Audience",         href: "/admin/audience",     group: "Navigate" },
  { label: "Activity Log",     href: "/admin/activity",     group: "Navigate" },
  { label: "Settings",         href: "/admin/settings",     group: "Navigate" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit>({ clients: [], appointments: [], services: [] });

  // ⌘K / Ctrl+K to open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits({ clients: [], appointments: [], services: [] });
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/command-search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        setHits({
          clients: Array.isArray(data?.clients) ? data.clients : [],
          appointments: Array.isArray(data?.appointments) ? data.appointments : [],
          services: Array.isArray(data?.services) ? data.services : [],
        });
      } catch {
        // ignore — keep previous hits
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-navy-950)]/50 backdrop-blur-[2px] data-[state=open]:animate-admin-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sheet)] focus:outline-none data-[state=open]:animate-[admin-scale-in_180ms_ease]"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Quick search</Dialog.Title>
          <Command label="Admin search" className="w-full">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
              <svg className="h-4 w-4 text-[var(--color-text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search clients, appointments, services, or jump to a page…"
                className="flex-1 bg-transparent text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none"
              />
              <kbd className="text-[0.6875rem] uppercase tracking-wide text-[var(--color-text-subtle)] border border-[var(--color-border)] rounded px-1.5 py-0.5">Esc</kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="py-10 text-center text-[0.8125rem] text-[var(--color-text-subtle)]">
                {query.length < 2 ? "Type to search." : "No matches found."}
              </Command.Empty>

              {hits.clients.length > 0 && (
                <Command.Group heading="Clients" className={groupClass}>
                  {hits.clients.map((c) => {
                    const emailShown = displayEmail(c.email);
                    return (
                      <Command.Item
                        key={c.email}
                        value={`client ${c.name} ${c.email} ${c.phone || ""}`}
                        onSelect={() => go(`/admin/clients/${encodeURIComponent(c.email)}`)}
                        className={itemClass}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-[var(--color-cream-200)] text-[var(--color-text-muted)] text-[0.6875rem] font-medium flex items-center justify-center shrink-0">
                            {c.name.trim().charAt(0).toUpperCase() || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[0.8125rem] text-[var(--color-text)] truncate flex items-center gap-1.5">
                              {c.name}
                              {c.banned && <span className="text-[0.625rem] uppercase tracking-widest text-[var(--color-danger)]">banned</span>}
                            </p>
                            <p className="text-[0.6875rem] text-[var(--color-text-subtle)] truncate">
                              {emailShown || c.phone || "—"}
                            </p>
                          </div>
                        </div>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {hits.appointments.length > 0 && (
                <Command.Group heading="Appointments" className={groupClass}>
                  {hits.appointments.map((a) => (
                    <Command.Item
                      key={a.id}
                      value={`appointment ${a.client_name} ${a.client_email} ${a.date}`}
                      onSelect={() => go(`/admin/appointments?focus=${a.id}`)}
                      className={itemClass}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] text-[var(--color-text)] truncate">{a.client_name}</p>
                        <p className="text-[0.6875rem] text-[var(--color-text-subtle)] truncate">
                          {formatDate(a.date, "withDay")} · {formatTime(a.start_time)} · {a.status}
                        </p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {hits.services.length > 0 && (
                <Command.Group heading="Services" className={groupClass}>
                  {hits.services.map((s) => (
                    <Command.Item
                      key={s.id}
                      value={`service ${s.name} ${s.category}`}
                      onSelect={() => go(s.slug ? `/services/item/${s.slug}` : `/admin/services`)}
                      className={itemClass}
                    >
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[0.8125rem] text-[var(--color-text)] truncate">{s.name}</p>
                          <p className="text-[0.6875rem] text-[var(--color-text-subtle)]">{s.category}</p>
                        </div>
                        <span className="text-[0.75rem] text-[var(--color-accent-gold)] shrink-0">{s.price_text}</span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Navigate" className={groupClass}>
                {PAGES.map((p) => (
                  <Command.Item
                    key={p.href}
                    value={`navigate ${p.label} ${p.href}`}
                    onSelect={() => go(p.href)}
                    className={itemClass}
                  >
                    <svg className="h-3.5 w-3.5 text-[var(--color-text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-[0.8125rem] text-[var(--color-text)]">{p.label}</span>
                    <span className="ml-auto text-[0.6875rem] text-[var(--color-text-subtle)] font-mono">{p.href}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>

            <div className="border-t border-[var(--color-border)] px-4 py-2 flex items-center gap-4 text-[0.6875rem] text-[var(--color-text-subtle)]">
              <span className="inline-flex items-center gap-1">
                <kbd className="border border-[var(--color-border)] rounded px-1">↑↓</kbd> navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="border border-[var(--color-border)] rounded px-1">↵</kbd> open
              </span>
              <span className="inline-flex items-center gap-1 ml-auto">
                <kbd className="border border-[var(--color-border)] rounded px-1">⌘K</kbd> toggle
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const groupClass = "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-[var(--color-text-subtle)]";
const itemClass = cn(
  "flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer outline-none",
  "data-[selected=true]:bg-[var(--color-cream-200)]/60",
);
