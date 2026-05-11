"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_COLORS, formatActivity } from "@/lib/activityFormat";
import ClearHistoryModal from "@/components/admin/ClearHistoryModal";

interface Entry {
  id: string;
  action: string;
  details: string | null;
  appointment_id: string | null;
  actor_email: string | null;
  actor_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const CATEGORIES = [
  { id: "", label: "All actions" },
  { id: "booking", label: "Bookings" },
  { id: "service", label: "Services" },
  { id: "stylist", label: "Stylists" },
  { id: "schedule", label: "Schedule" },
  { id: "client", label: "Clients" },
  { id: "settings", label: "Settings" },
  { id: "user", label: "Users" },
  { id: "auth", label: "Auth / sign-in" },
  { id: "sms", label: "SMS delivery" },
  { id: "other", label: "Other" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const isSame = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSame(d, today)) return "Today";
  if (isSame(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role;
  const permissions = session?.user?.permissions;
  // Activity / audit log is gated on view_analytics. Falls back to a
  // role-based admin check for sessions minted before the permissions
  // field rolled out (4-hour JWT TTL window).
  const canView =
    (Array.isArray(permissions) && permissions.includes("view_analytics")) ||
    (!permissions && userRole === "admin");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedQ = useDebounced(searchInput, 200);

  const [category, setCategory] = useState("");
  const [actor, setActor] = useState("");
  const [actors, setActors] = useState<string[]>([]);
  const [counts, setCounts] = useState<{ today: number; week: number; month: number }>({ today: 0, week: 0, month: 0 });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
    // Activity / audit log gated on view_analytics. Pre-permissions
    // sessions still gate on the legacy admin role.
    if (status === "authenticated" && !canView) router.push("/admin");
  }, [status, router, canView]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/activity", { method: "OPTIONS" })
      .then((r) => r.json())
      .then((d) => {
        setActors(Array.isArray(d?.actors) ? d.actors : []);
        if (d?.counts) setCounts(d.counts);
      })
      .catch(() => setActors([]));
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (category) params.set("category", category);
    if (actor) params.set("actor", actor);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    fetch(`/api/admin/activity?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      })
      .finally(() => setLoading(false));
  }, [debouncedQ, category, actor, from, to, page, status]);

  useEffect(() => { setPage(1); }, [debouncedQ, category, actor, from, to]);

  // Group by day for sticky headers.
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const k = dayKey(e.created_at);
      const list = map.get(k) || [];
      list.push(e);
      map.set(k, list);
    }
    return [...map.entries()];
  }, [entries]);

  const summary = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const e of entries) {
      const v = formatActivity(e.action, e.details);
      byCat[v.category] = (byCat[v.category] || 0) + 1;
    }
    return byCat;
  }, [entries]);

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl">Activity Log</h1>
          <p className="text-navy/40 text-sm font-body mt-1">
            {counts.today.toLocaleString()} today · {counts.week.toLocaleString()} past 7d · {counts.month.toLocaleString()} past 30d · {total.toLocaleString()} match{total === 1 ? "" : "es"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(summary)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([cat, count]) => (
              <span key={cat} className={`text-[10px] uppercase tracking-widest font-body px-2 py-1 ${CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other}`}>
                {count} {cat}
              </span>
            ))}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- server route */}
          <a
            href={(() => {
              const p = new URLSearchParams();
              if (debouncedQ) p.set("q", debouncedQ);
              if (category) p.set("category", category);
              if (actor) p.set("actor", actor);
              if (from) p.set("from", from);
              if (to) p.set("to", to);
              return `/api/admin/activity/export/?${p.toString()}`;
            })()}
            className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5 uppercase tracking-widest"
          >
            Export CSV
          </a>
          <button
            onClick={() => setClearOpen(true)}
            className="px-3 py-1.5 text-xs font-body border border-red-200 text-red-600 hover:bg-red-50 uppercase tracking-widest"
          >
            Clear history
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-start">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search actions, details, actor email"
          className="border border-navy/20 px-3 py-2 text-sm font-body min-w-[260px] flex-1 sm:flex-none"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body">
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body">
          <option value="">All actors</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" title="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" title="To date" />
        {(searchInput || category || actor || from || to) && (
          <button
            onClick={() => { setSearchInput(""); setCategory(""); setActor(""); setFrom(""); setTo(""); }}
            className="px-3 py-2 text-xs font-body text-navy/60 border border-navy/20 hover:bg-navy/5"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading activity…</p>
      ) : entries.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No activity matches.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <h3 className="text-xs font-body text-navy/50 uppercase tracking-widest mb-2 sticky top-0 bg-cream py-2 z-10">{day}</h3>
              <div className="bg-white border border-navy/10 divide-y divide-navy/5">
                {items.map((e) => {
                  const view = formatActivity(e.action, e.details);
                  const expanded = expandedId === e.id;
                  return (
                    <div key={e.id} className="px-4 sm:px-6 py-3">
                      <button
                        onClick={() => setExpandedId(expanded ? null : e.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] uppercase tracking-widest font-body px-2 py-0.5 ${CATEGORY_COLORS[view.category]}`}>
                                {view.category}
                              </span>
                              <p className="font-body text-sm text-navy truncate">{view.title}</p>
                            </div>
                            <p className="text-xs text-navy/50 font-body mt-1">
                              {e.actor_email || "system"} · {formatDate(e.created_at)}
                            </p>
                          </div>
                          <span className="text-navy/30 text-xs">{expanded ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="mt-3 p-3 bg-cream/50 border border-navy/5 text-xs font-body space-y-2 text-navy/70">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <p className="text-navy/40 uppercase tracking-widest text-[10px]">Action</p>
                              <p className="font-mono">{e.action}</p>
                            </div>
                            <div>
                              <p className="text-navy/40 uppercase tracking-widest text-[10px]">Actor</p>
                              <p>{e.actor_email || "—"}</p>
                            </div>
                            <div>
                              <p className="text-navy/40 uppercase tracking-widest text-[10px]">IP</p>
                              <p className="font-mono">{e.ip_address || "—"}</p>
                            </div>
                            <div>
                              <p className="text-navy/40 uppercase tracking-widest text-[10px]">When</p>
                              <p>{new Date(e.created_at).toISOString()}</p>
                            </div>
                          </div>
                          {e.user_agent && (
                            <div>
                              <p className="text-navy/40 uppercase tracking-widest text-[10px]">User agent</p>
                              <p className="break-all text-[11px]">{e.user_agent}</p>
                            </div>
                          )}
                          {e.details && (
                            <div>
                              <p className="text-navy/40 uppercase tracking-widest text-[10px]">Details</p>
                              <pre className="bg-white border border-navy/5 p-2 overflow-x-auto text-[11px]">{
                                (() => {
                                  try { return JSON.stringify(JSON.parse(e.details), null, 2); }
                                  catch { return e.details; }
                                })()
                              }</pre>
                            </div>
                          )}
                          {e.appointment_id && (
                            <Link
                              href={`/admin/appointments?focus=${e.appointment_id}`}
                              className="inline-block text-rose hover:underline text-xs font-body"
                            >
                              Jump to appointment →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between mt-4 text-sm font-body text-navy/60">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-navy/20 disabled:opacity-40 hover:bg-navy/5">
            ← Previous
          </button>
          <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-navy/20 disabled:opacity-40 hover:bg-navy/5">
            Next →
          </button>
        </div>
      )}

      <ClearHistoryModal
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear activity log"
        description="Permanently delete audit-log rows by date range."
        endpoint="/api/admin/activity-log/clear"
        onCleared={() => { setPage(1); location.reload(); }}
      />
    </div>
  );
}
