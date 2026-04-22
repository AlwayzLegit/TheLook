"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import KeyboardShortcuts from "@/components/admin/KeyboardShortcuts";
import NotificationsBell from "@/components/admin/NotificationsBell";
import IdleTimeout from "@/components/admin/IdleTimeout";
import CommandPalette from "@/components/admin/CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────
// Phase 0 admin shell — grouped sidebar + top bar + command-palette
// trigger + user menu + toaster + idle timeout.
// Feature parity with the old layout (badge counts, mobile drawer,
// notifications bell) with the new design language applied.
// ─────────────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon?: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin",           label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/admin/appointments", label: "Appointments" },
      { href: "/admin/schedule",     label: "Schedule" },
      { href: "/admin/waitlist",     label: "Waitlist" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/clients",  label: "Clients" },
      { href: "/admin/stylists", label: "Stylists" },
      { href: "/admin/users",    label: "Users" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/services",    label: "Services" },
      { href: "/admin/products",    label: "Inventory" },
      { href: "/admin/discounts",   label: "Discounts" },
      { href: "/admin/commissions", label: "Commissions" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/messages", label: "Messages" },
      { href: "/admin/reviews",  label: "Reviews" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/activity", label: "Activity Log" },
    ],
  },
];

function useBadgeCounts() {
  const { status } = useSession();
  const [pending, setPending] = useState(0);
  const [messages, setMessages] = useState(0);
  useEffect(() => {
    if (status !== "authenticated") return;
    const load = () => {
      fetch("/api/admin/appointments?status=pending")
        .then((r) => r.json())
        .then((data) => setPending(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
      fetch("/api/admin/messages")
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [status]);
  return { pending, messages };
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname() || "";
  const badges = useBadgeCounts();
  const badgeFor = (href: string) => {
    if (href === "/admin/appointments") return badges.pending;
    if (href === "/admin/messages") return badges.messages;
    return 0;
  };

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto py-4 space-y-6">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-4 mb-1.5 text-[0.6875rem] uppercase tracking-[0.15em] text-white/35">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((it) => {
              const active = isActive(pathname, it.href);
              const b = badgeFor(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onItemClick}
                    aria-current={active ? "page" : undefined}
                    className={
                      "group relative flex items-center gap-2 pl-4 pr-3 py-2 text-[0.8125rem] font-body rounded-sm transition-colors " +
                      (active
                        ? "text-white bg-white/5"
                        : "text-white/60 hover:text-white hover:bg-white/5")
                    }
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[var(--color-crimson-600)]"
                      />
                    )}
                    <span className="flex-1">{it.label}</span>
                    {b > 0 && (
                      <span className="text-[10px] font-medium bg-[var(--color-crimson-600)] text-white rounded-full min-w-[1.25rem] px-1.5 text-center py-0.5">
                        {b > 99 ? "99+" : b}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const email = (session?.user as any)?.email as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role as string | undefined;
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-cream-200)]/50 transition-colors" aria-label="Account menu">
          <span className="h-7 w-7 rounded-full bg-[var(--color-navy-900)] text-white text-[0.75rem] font-medium flex items-center justify-center">
            {initial}
          </span>
          <svg className="h-3.5 w-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal text-[var(--color-text)]">
          <span className="truncate text-[0.8125rem]">{email || "Admin"}</span>
          {role && <Badge tone={role === "admin" ? "accent" : "info"} size="sm" className="w-fit">{role}</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">Back to website</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onClick={() => signOut({ callbackUrl: "/admin/login" })}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommandButton() {
  // Visual trigger for ⌘K — fires the same keyboard shortcut so the
  // palette (mounted once globally) owns the open-state.
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      }}
      className="hidden md:flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-cream-50)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-text-subtle)] hover:border-[var(--color-border-strong)] transition-colors w-72"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
      <span className="flex-1 text-left">Search clients, bookings, services…</span>
      <kbd className="text-[0.6875rem] uppercase tracking-wide border border-[var(--color-border)] rounded px-1.5 py-0.5 bg-[var(--color-surface)]">⌘K</kbd>
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-shell flex min-h-screen bg-[var(--color-surface-sunken)]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--color-navy-900)] z-40 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-lg text-white tracking-wider">THE LOOK</span>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle admin menu"
            className="text-white/70 hover:text-white p-1"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      {/* Mobile + desktop sidebar */}
      <aside
        className={
          "fixed lg:sticky top-0 left-0 z-50 w-64 bg-[var(--color-navy-900)] h-screen flex flex-col transition-transform duration-300 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
        }
      >
        <div className="flex-none px-5 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl text-white tracking-wider" onClick={() => setMobileOpen(false)}>
            THE LOOK
          </Link>
          <NotificationsBell />
        </div>
        <SidebarNav onItemClick={() => setMobileOpen(false)} />
        <div className="flex-none px-4 py-3 border-t border-white/5 text-[0.6875rem] text-white/30 font-body">
          Admin · v2
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 hidden lg:flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur px-6 h-14">
          <CommandButton />
          <div className="flex-1" />
          <UserMenu />
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <KeyboardShortcuts />
      <IdleTimeout />
      <CommandPalette />
      <Toaster />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
