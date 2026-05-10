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
import { type Permission } from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────────────
// Phase 0 admin shell — grouped sidebar + top bar + command-palette
// trigger + user menu + toaster + idle timeout.
// Feature parity with the old layout (badge counts, mobile drawer,
// notifications bell) with the new design language applied.
// ─────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  // The permission the user must hold to see this link. Omitted = "any
  // admin permission is fine" (just being in the shell is enough, e.g.
  // dashboard). Round-26 swap from the old role-based adminOnly flag.
  permission?: Permission;
};
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin",           label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics", permission: "view_analytics" },
      { href: "/admin/audience",  label: "Audience",  permission: "view_analytics" },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/admin/appointments", label: "Appointments", permission: "manage_bookings" },
      { href: "/admin/schedule",     label: "Schedule",     permission: "manage_bookings" },
      { href: "/admin/waitlist",     label: "Waitlist",     permission: "manage_bookings" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/clients",  label: "Clients",  permission: "manage_clients" },
      { href: "/admin/stylists", label: "Stylists", permission: "manage_team" },
      { href: "/admin/users",    label: "Users",    permission: "manage_users" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/services",    label: "Services",    permission: "manage_catalog" },
      { href: "/admin/gallery",     label: "Gallery",     permission: "manage_content" },
      { href: "/admin/blog",        label: "Blog",        permission: "manage_content" },
      { href: "/admin/products",    label: "Inventory",   permission: "manage_catalog" },
      { href: "/admin/discounts",   label: "Discounts",   permission: "manage_catalog" },
      { href: "/admin/commissions", label: "Commissions", permission: "manage_team" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/messages",  label: "Messages",  permission: "manage_clients" },
      { href: "/admin/reviews",   label: "Reviews",   permission: "manage_settings" },
      { href: "/admin/broadcast", label: "Broadcast", permission: "manage_clients" },
    ],
  },
  {
    label: "Brand",
    items: [
      // /admin/branding is the operational image-swap surface. It now
      // sits under manage_settings — same gate as the rest of the
      // settings group below.
      { href: "/admin/branding", label: "Branding", permission: "manage_settings" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings",     permission: "manage_settings" },
      { href: "/admin/activity", label: "Activity Log", permission: "view_analytics" },
      { href: "/admin/errors",   label: "Errors",       permission: "view_analytics" },
    ],
  },
];

// Tiny gate: returns true when the session has `required` in its
// permissions array, OR when `required` is undefined (open to anyone
// in the admin shell), OR when the session predates the permissions
// rollout (no permissions array yet) and the legacy admin/manager
// role is good enough. The legacy fallback can come out once active
// sessions have rolled over.
function sessionHasPermission(
  permissions: ReadonlyArray<string> | undefined,
  role: string | undefined,
  required: Permission | undefined,
): boolean {
  if (!required) return true;
  if (Array.isArray(permissions) && permissions.length > 0) {
    return permissions.includes(required);
  }
  // Pre-permissions session: admin sees everything, manager sees
  // everything except manage_users.
  if (role === "admin") return true;
  if (role === "manager") return required !== "manage_users";
  return false;
}

function useBadgeCounts() {
  const { status, data: session } = useSession();
  const permissions = session?.user?.permissions;
  const role = session?.user?.role;
  const canViewAnalytics = sessionHasPermission(permissions, role, "view_analytics");
  const [pending, setPending] = useState(0);
  const [messages, setMessages] = useState(0);
  // Sentry unresolved-issue count for the last 24h. Refreshes on the
  // same 30s tick as the other badges so the operator sees a new
  // production error within at most one minute of it being captured.
  const [errors, setErrors] = useState(0);
  useEffect(() => {
    if (status !== "authenticated") return;
    const load = () => {
      // Appointments badge matches what the admin sees when they click
      // through to /admin/appointments (default `from=today`). Pending
      // rows with a past date are stale and shouldn't nag forever;
      // they're surfaced separately on the dashboard as "overdue
      // pending" with a deep-link filter.
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const fromDate = `${y}-${m}-${d}`;
      fetch(`/api/admin/appointments?status=pending&from=${fromDate}`)
        .then((r) => r.json())
        .then((data) => setPending(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
      // Messages badge counts unread only (matches the dashboard's
      // "Needs attention" card, post-PR C + migration 20260505).
      fetch("/api/admin/messages?unreadOnly=true")
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
      // Errors badge — pulls the unresolved Sentry-issue count via our
      // proxy. Gated on view_analytics: users without the permission
      // won't see the link anyway, and polling it for them would write
      // an auth.rbac.denied audit row every 30s.
      if (canViewAnalytics) {
        fetch("/api/admin/errors?count=true&period=24h&query=is:unresolved")
          .then((r) => r.json())
          .then((data) => {
            const c = typeof data?.count === "number" ? data.count : 0;
            setErrors(c);
          })
          .catch(() => {});
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [status, canViewAnalytics]);
  return { pending, messages, errors };
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname() || "";
  const badges = useBadgeCounts();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const permissions = session?.user?.permissions;
  const badgeFor = (href: string) => {
    if (href === "/admin/appointments") return badges.pending;
    if (href === "/admin/messages") return badges.messages;
    if (href === "/admin/errors") return badges.errors;
    return 0;
  };

  // Strip items whose permission the user doesn't have, then drop any
  // group that ends up empty so we don't render "System" with no
  // children for an operator without view_analytics + manage_settings.
  const visibleNav = NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((it) =>
        sessionHasPermission(permissions, role, it.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto py-4 space-y-6">
      {visibleNav.map((group) => (
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

// Mobile-only user footer baked into the sidebar drawer. Desktop keeps
// the top-right dropdown (UserMenu); on phones that top bar is hidden
// and the drawer was the only place with room to surface My profile /
// Settings / Back to website / Sign out. Renders as flat nav items so
// tap targets stay generous and no z-index juggling is needed for a
// nested DropdownMenu inside a drawer.
function MobileUserFooter({ onNavigate }: { onNavigate: () => void }) {
  const { data: session } = useSession();
  const email = session?.user?.email ?? undefined;
  const role = session?.user?.role ?? undefined;
  const title = session?.user?.title ?? undefined;
  const permissions = session?.user?.permissions;
  const canManageSettings = sessionHasPermission(permissions, role, "manage_settings");
  const initial = (email || "?").charAt(0).toUpperCase();
  const subtitle = title || role || undefined;
  const go = (href: string) => {
    onNavigate();
    window.location.href = href;
  };
  return (
    <div className="lg:hidden flex-none border-t border-white/5 px-3 py-3 space-y-1">
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="h-9 w-9 shrink-0 rounded-full bg-white/10 text-white/90 text-[0.8125rem] font-medium flex items-center justify-center">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] text-white/90">{email || "Admin"}</p>
          {subtitle ? (
            <p className="truncate text-[0.6875rem] uppercase tracking-wider text-white/40">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <button
        onClick={() => go("/admin/profile")}
        className="w-full text-left px-3 py-2 rounded text-[0.875rem] text-white/80 hover:bg-white/5"
      >
        My profile
      </button>
      {canManageSettings && (
        <button
          onClick={() => go("/admin/settings")}
          className="w-full text-left px-3 py-2 rounded text-[0.875rem] text-white/80 hover:bg-white/5"
        >
          Settings
        </button>
      )}
      <button
        onClick={() => go("/")}
        className="w-full text-left px-3 py-2 rounded text-[0.875rem] text-white/80 hover:bg-white/5"
      >
        Back to website
      </button>
      <button
        onClick={() => { onNavigate(); signOut({ callbackUrl: "/admin/login" }); }}
        className="w-full text-left px-3 py-2 rounded text-[0.875rem] text-[var(--color-crimson-400)] hover:bg-white/5"
      >
        Sign out
      </button>
    </div>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const email = session?.user?.email ?? undefined;
  const role = session?.user?.role ?? undefined;
  const title = session?.user?.title ?? undefined;
  const permissions = session?.user?.permissions;
  const canManageSettings = sessionHasPermission(permissions, role, "manage_settings");
  const initial = (email || "?").charAt(0).toUpperCase();
  // Custom title wins over the legacy role label so an operator who
  // typed "Receptionist" sees that, not "manager".
  const badgeLabel = title || role;
  const badgeTone = role === "admin" ? "accent" : "info";
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
          {badgeLabel && <Badge tone={badgeTone} size="sm" className="w-fit">{badgeLabel}</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { window.location.href = "/admin/profile"; }}>
          My profile
        </DropdownMenuItem>
        {canManageSettings && (
          <DropdownMenuItem onSelect={() => { window.location.href = "/admin/settings"; }}>
            Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => { window.location.href = "/"; }}>
          Back to website
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
  const { status, data: session } = useSession();
  const role = session?.user?.role;

  // Fetch idle_timeout_minutes once + write it to the <html> element so
  // the IdleTimeout component picks up the admin's override.
  // Admin-only after round-9 RBAC tightening; managers fall back to
  // the default idle TTL (8h, plenty for an active session) rather
  // than each page load writing an auth.rbac.denied audit row.
  useEffect(() => {
    if (status !== "authenticated" || role !== "admin") return;
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const v = data?.idle_timeout_minutes;
        const parsed = v ? parseInt(v, 10) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
          document.documentElement.setAttribute("data-idle-timeout-min", String(parsed));
        }
      })
      .catch(() => {});
  }, [status, role]);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-shell flex min-h-[100dvh] bg-[var(--color-surface-sunken)]">
      {/* Mobile header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--color-navy-900)] z-40 px-4 flex items-center justify-between"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0.75rem",
          paddingLeft: "calc(1rem + env(safe-area-inset-left, 0px))",
          paddingRight: "calc(1rem + env(safe-area-inset-right, 0px))",
        }}
      >
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
          "fixed lg:sticky top-0 left-0 z-50 w-64 bg-[var(--color-navy-900)] h-[100dvh] flex flex-col transition-transform duration-300 " +
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
        <MobileUserFooter onNavigate={() => setMobileOpen(false)} />
        <div className="flex-none px-4 py-3 border-t border-white/5 text-[0.6875rem] text-white/30 font-body">
          The Look
        </div>
      </aside>

      {/* Main column. Top padding has to grow with the iPhone safe-area
          so the first row of content clears the notched mobile header. */}
      <div className="flex-1 min-w-0 flex flex-col pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0">
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
