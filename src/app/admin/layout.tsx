"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import KeyboardShortcuts from "@/components/admin/KeyboardShortcuts";

type NavItem = {
  href: string;
  label: string;
  adminOnly: boolean;
  stylistOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", adminOnly: false },
  { href: "/admin/appointments", label: "Appointments", adminOnly: false },
  { href: "/admin/waitlist", label: "Waitlist", adminOnly: false },
  { href: "/admin/clients", label: "Clients", adminOnly: false },
  { href: "/admin/messages", label: "Messages", adminOnly: true },
  { href: "/admin/reviews", label: "Reviews", adminOnly: true },
  { href: "/admin/analytics", label: "Analytics", adminOnly: true },
  { href: "/admin/commissions", label: "Commissions", adminOnly: true },
  { href: "/admin/services", label: "Services", adminOnly: true },
  { href: "/admin/stylists", label: "Stylists", adminOnly: true },
  { href: "/admin/products", label: "Inventory", adminOnly: true },
  { href: "/admin/discounts", label: "Discounts", adminOnly: true },
  { href: "/admin/schedule", label: "Schedule", adminOnly: false },
  { href: "/admin/my-profile", label: "My Profile", adminOnly: false, stylistOnly: true },
  { href: "/admin/users", label: "Users", adminOnly: true },
  { href: "/admin/activity", label: "Activity Log", adminOnly: true },
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
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useBadgeCounts();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session?.user as any)?.role || "admin";

  if (pathname === "/admin/login") return null;

  const visibleNavItems = navItems.filter((item) => {
    if (item.stylistOnly) return userRole === "stylist";
    return !item.adminOnly || userRole === "admin";
  });

  const getBadge = (href: string) => {
    if (href === "/admin/appointments" && badges.pending > 0) return badges.pending;
    if (href === "/admin/messages" && badges.messages > 0) return badges.messages;
    return 0;
  };

  const navContent = (
    <>
      <Link href="/" className="block font-heading text-xl text-white tracking-wider mb-1">
        THE LOOK
      </Link>
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
