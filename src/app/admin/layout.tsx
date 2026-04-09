"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/stylists", label: "Stylists" },
  { href: "/admin/schedule", label: "Schedule" },
];

function AdminSidebar() {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  return (
    <aside className="w-64 bg-navy min-h-screen p-6 shrink-0">
      <Link href="/" className="block font-heading text-xl text-white tracking-wider mb-1">
        THE LOOK
      </Link>
      <p className="text-gold text-xs tracking-[0.2em] uppercase font-body mb-8">Admin Panel</p>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-2.5 text-sm font-body rounded transition-colors ${
              pathname === item.href
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-8">
        <Link
          href="/"
          className="block px-4 py-2 text-white/30 hover:text-white/60 text-xs font-body transition-colors"
        >
          &larr; Back to website
        </Link>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-cream">
        <AdminSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </SessionProvider>
  );
}
