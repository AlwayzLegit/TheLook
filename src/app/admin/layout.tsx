"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import KeyboardShortcuts from "@/components/admin/KeyboardShortcuts";
import NotificationsBell from "@/components/admin/NotificationsBell";

// Stylist self-service accounts are disabled for now — the salon runs as
// admin-only. When stylists get their own logins later, restore the role
// filtering + the "My Profile" nav item and un-hide /admin/my-profile.
type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/commissions", label: "Commissions" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/stylists", label: "Stylists" },
  { href: "/admin/products", label: "Inventory" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/activity", label: "Activity Log" },
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
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [status]);

  return { pending, messages };
}

function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useBadgeCounts();

  if (pathname === "/admin/login") return null;

  // Role-based filtering is off while stylist accounts are disabled; every
  // signed-in admin sees every nav item.
  const visibleNavItems = navItems;

  const getBadge = (href: string) => {
    if (href === "/admin/appointments" && badges.pending > 0) return badges.pending;
    if (href === "/admin/messages" && badges.messages > 0) return badges.messages;
    return 0;
  };

  const navContent = (
    <>
      <div className="flex items-start justify-between mb-1">
        <Link href="/" className="block font-heading text-xl text-white tracking-wider">
          THE LOOK
        </Link>
        <div className="hidden lg:block -mt-1">
          <NotificationsBell />
        </div>
      </div>
      <p className="text-gold text-xs tracking-[0.2em] uppercase font-body mb-8">Admin Panel</p>

      <nav className="space-y-1">
        {visibleNavItems.map((item) => {
          const badge = getBadge(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-4 py-2.5 text-sm font-body rounded transition-colors ${
                pathname === item.href
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.label}</span>
              {badge > 0 && (
                <span className="bg-rose text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <Link
          href="/"
          className="block px-4 py-2 text-white/30 hover:text-white/60 text-xs font-body transition-colors"
        >
          &larr; Back to website
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-navy z-40 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-lg text-white tracking-wider">THE LOOK</span>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle admin menu"
            className="text-white/70 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile slide-out sidebar */}
      <aside className={`lg:hidden fixed top-0 left-0 w-64 bg-navy min-h-screen p-6 z-50 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-navy min-h-screen p-6 shrink-0">
        {navContent}
      </aside>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-cream">
        <AdminSidebar />
        <div className="flex-1 pt-14 lg:pt-0">{children}</div>
        <KeyboardShortcuts />
      </div>
    </SessionProvider>
  );
}
