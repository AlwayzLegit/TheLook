"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ClientRow {
  email: string;
  name: string;
  phone: string | null;
  birthday: string | null;
  banned: boolean;
  bannedReason: string | null;
  importedAt: string | null;
  visits: number;
  noShows: number;
  totalSpent: number;
  lastVisit: string | null;
}

interface SearchHit {
  email: string;
  name: string;
  phone: string | null;
  banned: boolean;
}

function formatCents(c: number) {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function ClientsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, 180);
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [typeaheadResults, setTypeaheadResults] = useState<SearchHit[]>([]);
  const [typeaheadHi, setTypeaheadHi] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const [sort, setSort] = useState<"recent" | "visits" | "spent" | "name">("recent");
  const [bannedOnly, setBannedOnly] = useState(false);
  const [hasVisitsOnly, setHasVisitsOnly] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<null | { total: number; inserted: number; updated: number; skipped: unknown[]; errors: string[] }>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  // Typeahead — runs from the raw input so it feels instant, but debounced.
  useEffect(() => {
    if (status !== "authenticated") return;
    const q = debouncedSearch.trim();
    if (q.length < 2) {
      setTypeaheadResults([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/clients/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setTypeaheadResults(Array.isArray(data?.results) ? data.results : []);
        setTypeaheadHi(0);
      })
      .catch(() => setTypeaheadResults([]));
    return () => { cancelled = true; };
  }, [debouncedSearch, status]);

  // Full list (respects committed search via `q`, sort, filters).
  const [committedQuery, setCommittedQuery] = useState("");
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const params = new URLSearchParams();
    if (committedQuery) params.set("q", committedQuery);
    if (bannedOnly) params.set("banned", "true");
    if (hasVisitsOnly) params.set("hasVisits", "true");
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    fetch(`/api/admin/clients?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setClients(Array.isArray(data?.clients) ? data.clients : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      })
      .finally(() => setLoading(false));
  }, [committedQuery, bannedOnly, hasVisitsOnly, sort, page, status]);

  // Close typeahead on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setTypeaheadOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const runImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/clients/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ total: 0, inserted: 0, updated: 0, skipped: [], errors: [data.error || "Import failed."] });
        return;
      }
      setImportResult(data);
      // Refresh the list.
      setPage(1);
      setCommittedQuery(committedQuery); // trigger re-fetch via effect (no-op update is ok)
    } finally {
      setImporting(false);
    }
  };

  if (status !== "authenticated") return null;

  const handleSearchSubmit = (hit?: SearchHit) => {
    if (hit) {
      router.push(`/admin/clients/${encodeURIComponent(hit.email)}`);
      return;
    }
    setCommittedQuery(searchInput.trim());
    setPage(1);
    setTypeaheadOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!typeaheadOpen || typeaheadResults.length === 0) {
      if (e.key === "Enter") handleSearchSubmit();
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setTypeaheadHi((h) => Math.min(h + 1, typeaheadResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setTypeaheadHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); handleSearchSubmit(typeaheadResults[typeaheadHi]); }
    else if (e.key === "Escape") setTypeaheadOpen(false);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl">Clients</h1>
          <p className="text-navy/40 text-sm font-body mt-1">{total.toLocaleString()} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-3 py-2 text-xs font-body border border-navy/20 hover:bg-navy/5 uppercase tracking-widest"
          >
            Import CSV
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this is a server route, not a page */}
          <a
            href="/api/admin/clients/export/"
            className="px-3 py-2 text-xs font-body border border-navy/20 hover:bg-navy/5 uppercase tracking-widest"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-start">
        <div ref={searchRef} className="relative min-w-[280px] flex-1 sm:flex-none">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setTypeaheadOpen(true); }}
            onFocus={() => setTypeaheadOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, email, or phone"
            className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
          />
          {typeaheadOpen && typeaheadResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-navy/10 shadow-lg z-30 max-h-80 overflow-y-auto">
              {typeaheadResults.map((hit, i) => (
                <button
                  key={hit.email}
                  type="button"
                  onMouseEnter={() => setTypeaheadHi(i)}
                  onClick={() => handleSearchSubmit(hit)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 ${i === typeaheadHi ? "bg-rose/5" : "hover:bg-navy/5"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-body font-bold truncate">{hit.name}</p>
                    <p className="text-xs font-body text-navy/50 truncate">{hit.email}{hit.phone ? ` · ${hit.phone}` : ""}</p>
                  </div>
                  {hit.banned && (
                    <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-700 px-1.5 py-0.5 font-body shrink-0">Banned</span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full px-3 py-2 text-left text-xs font-body text-navy/50 hover:bg-navy/5 border-t border-navy/5"
              >
                Show all matches for &ldquo;{searchInput.trim()}&rdquo; &rarr;
              </button>
            </div>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}
          className="border border-navy/20 px-3 py-2 text-sm font-body"
        >
          <option value="recent">Most recent</option>
          <option value="visits">Most visits</option>
          <option value="spent">Highest spent</option>
          <option value="name">Name (A–Z)</option>
        </select>

        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-body text-navy/60 border border-navy/15 px-3 py-2">
          <input type="checkbox" checked={hasVisitsOnly} onChange={(e) => { setHasVisitsOnly(e.target.checked); setPage(1); }} className="w-4 h-4" />
          Has visits
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-body text-navy/60 border border-navy/15 px-3 py-2">
          <input type="checkbox" checked={bannedOnly} onChange={(e) => { setBannedOnly(e.target.checked); setPage(1); }} className="w-4 h-4" />
          Banned only
        </label>

        {committedQuery && (
          <button
            onClick={() => { setSearchInput(""); setCommittedQuery(""); setPage(1); }}
            className="px-3 py-2 text-xs font-body text-navy/60 border border-navy/20 hover:bg-navy/5"
          >
            Clear search: &ldquo;{committedQuery}&rdquo; ×
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading clients...</p>
      ) : clients.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No clients match.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {clients.map((c) => (
            <div key={c.email} className={`px-4 sm:px-6 py-4 flex items-start justify-between gap-3 ${c.banned ? "bg-red-50/40" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/admin/clients/${encodeURIComponent(c.email)}`} className="font-body font-bold text-sm text-navy hover:text-rose truncate">
                    {c.name}
                  </Link>
                  {c.banned && (
                    <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-700 px-1.5 py-0.5 font-body">Banned</span>
                  )}
                  {c.visits > 1 && !c.banned && (
                    <span className="text-[10px] font-body bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{c.visits}x</span>
                  )}
                  {c.noShows > 0 && (
                    <span className="text-[10px] font-body bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{c.noShows} no-show{c.noShows > 1 ? "s" : ""}</span>
                  )}
                </div>
                <p className="text-navy/50 text-xs font-body break-all">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                <p className="text-navy/40 text-xs font-body mt-1">
                  {c.birthday ? `🎂 ${c.birthday} · ` : ""}Last visit: {c.lastVisit || "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading text-sm text-green-600">{formatCents(c.totalSpent)}</p>
                <p className="text-xs font-body text-navy/40">{c.visits} visit{c.visits !== 1 ? "s" : ""}</p>
                <div className="flex gap-2 mt-2 justify-end">
                  <a href={`mailto:${c.email}`} className="text-[10px] font-body text-blue-600 border border-blue-200 px-2 py-0.5 hover:bg-blue-50">Email</a>
                  {c.phone && <a href={`tel:${c.phone}`} className="text-[10px] font-body text-green-600 border border-green-200 px-2 py-0.5 hover:bg-green-50">Call</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between mt-4 text-sm font-body text-navy/60">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-navy/20 disabled:opacity-40 hover:bg-navy/5"
          >
            ← Previous
          </button>
          <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-navy/20 disabled:opacity-40 hover:bg-navy/5"
          >
            Next →
          </button>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !importing && setImportOpen(false)}>
          <div className="bg-white w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-xl">Import clients from CSV</h2>
              {!importing && <button onClick={() => setImportOpen(false)} className="text-navy/40 hover:text-navy text-2xl">&times;</button>}
            </div>
            <p className="text-xs font-body text-navy/60 mb-3">
              CSV columns (any order, case-insensitive): <strong>Name, Email, Phone, Date of Birth, Banned</strong>.
              Rows are upserted by email — re-importing the same file updates existing profiles.
            </p>
            {!importResult ? (
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={importing}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) runImport(f); }}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              />
            ) : (
              <div className="space-y-2 text-sm font-body">
                <p className="text-green-700">✓ {importResult.inserted} new · {importResult.updated} updated · {importResult.skipped.length} skipped</p>
                {importResult.errors.length > 0 && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                )}
                {importResult.skipped.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-navy/60">Show {importResult.skipped.length} skipped rows</summary>
                    <pre className="mt-2 bg-navy/5 p-2 max-h-40 overflow-y-auto">{JSON.stringify(importResult.skipped, null, 2)}</pre>
                  </details>
                )}
                <button
                  onClick={() => { setImportResult(null); setImportOpen(false); }}
                  className="mt-2 px-4 py-2 bg-navy text-white text-xs font-body uppercase tracking-widest hover:bg-navy/90"
                >
                  Done
                </button>
              </div>
            )}
            {importing && <p className="text-sm font-body text-navy/60 mt-3">Uploading + processing… (up to a minute for 2,000 rows)</p>}
          </div>
        </div>
      )}
    </div>
  );
}
