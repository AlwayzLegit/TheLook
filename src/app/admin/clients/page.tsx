"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ClientSummary {
  email: string;
  name: string;
  phone: string | null;
  visits: number;
  noShows: number;
  totalSpent: number;
  lastVisit: string;
  preferredStylist: string;
}

function formatCents(c: number) {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export default function ClientsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"visits" | "spent" | "recent">("recent");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);

    Promise.all([
      fetch("/api/admin/appointments").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
      fetch("/api/admin/stylists").then((r) => r.json()),
    ]).then(([appts, svcs, stys]) => {
      if (!Array.isArray(appts)) { setLoading(false); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svcMap = Object.fromEntries((Array.isArray(svcs) ? svcs : []).map((s: any) => [s.id, s]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const styMap = Object.fromEntries((Array.isArray(stys) ? stys : []).map((s: any) => [s.id, s]));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byEmail: Record<string, any[]> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appts.forEach((a: any) => {
        if (!byEmail[a.client_email]) byEmail[a.client_email] = [];
        byEmail[a.client_email].push(a);
      });

      const summaries: ClientSummary[] = Object.entries(byEmail).map(([email, apptList]) => {
        const billable = apptList.filter((a) => a.status === "confirmed" || a.status === "completed");
        const noShows = apptList.filter((a) => a.status === "no_show").length;
        const totalSpent = billable.reduce((s, a) => s + (svcMap[a.service_id]?.price_min || 0), 0);
        const sorted = [...apptList].sort((a, b) => b.date.localeCompare(a.date));
        const stylistCounts: Record<string, number> = {};
        billable.forEach((a) => { stylistCounts[a.stylist_id] = (stylistCounts[a.stylist_id] || 0) + 1; });
        const topStylistId = Object.entries(stylistCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        return {
          email,
          name: sorted[0]?.client_name || email,
          phone: sorted[0]?.client_phone || null,
          visits: billable.length,
          noShows,
          totalSpent,
          lastVisit: sorted[0]?.date || "",
          preferredStylist: topStylistId ? (styMap[topStylistId]?.name || "Unknown") : "—",
        };
      });

      setClients(summaries);
    }).finally(() => setLoading(false));
  }, [status]);

  if (status !== "authenticated") return null;

  let filtered = clients;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone || "").includes(q)
    );
  }
  if (sortBy === "visits") filtered = [...filtered].sort((a, b) => b.visits - a.visits);
  else if (sortBy === "spent") filtered = [...filtered].sort((a, b) => b.totalSpent - a.totalSpent);
  else filtered = [...filtered].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl">Clients</h1>
          <p className="text-navy/40 text-sm font-body mt-1">{clients.length} total clients</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone"
            className="border border-navy/20 px-3 py-2 text-sm font-body min-w-[200px]"
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="border border-navy/20 px-3 py-2 text-sm font-body">
            <option value="recent">Most Recent</option>
            <option value="visits">Most Visits</option>
            <option value="spent">Highest Spent</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading clients...</p>
      ) : filtered.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No clients found.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {filtered.map((c) => (
            <div key={c.email} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-body font-bold text-sm">{c.name}</p>
                  {c.visits > 1 && (
                    <span className="text-[10px] font-body bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{c.visits}x</span>
                  )}
                  {c.noShows > 0 && (
                    <span className="text-[10px] font-body bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{c.noShows} no-show{c.noShows > 1 ? "s" : ""}</span>
                  )}
                </div>
                <p className="text-navy/50 text-xs font-body">{c.email}{c.phone ? ` | ${c.phone}` : ""}</p>
                <p className="text-navy/40 text-xs font-body mt-1">
                  Preferred: {c.preferredStylist} &middot; Last visit: {c.lastVisit || "—"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="font-heading text-sm text-green-600">{formatCents(c.totalSpent)}</p>
                <p className="text-xs font-body text-navy/40">{c.visits} visit{c.visits !== 1 ? "s" : ""}</p>
                <div className="flex gap-2 mt-2">
                  <a href={`mailto:${c.email}`} className="text-[10px] font-body text-blue-600 border border-blue-200 px-2 py-0.5 hover:bg-blue-50">Email</a>
                  {c.phone && <a href={`tel:${c.phone}`} className="text-[10px] font-body text-green-600 border border-green-200 px-2 py-0.5 hover:bg-green-50">Call</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
