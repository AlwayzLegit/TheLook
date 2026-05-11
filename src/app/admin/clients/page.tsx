"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { displayEmail, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
  cardOnFile: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
}

// Stable color hash for the avatar tile. Same email = same color so
// the operator builds visual muscle memory for repeat clients without
// us having to ship per-client avatars.
const AVATAR_PALETTE = [
  "bg-rose/15 text-rose",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];
function avatarTone(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(name: string, fallback: string): string {
  const src = (name || fallback || "?").trim();
  return src
    .split(/[\s()@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
}
function relativeDate(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso + "T00:00:00").getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (Number.isNaN(days) || days < 0) return iso;
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface SearchHit {
  email: string;
  name: string;
  phone: string | null;
  banned: boolean;
}

const formatCents = (c: number) => formatMoney(c, { from: "cents" });

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
  const [hasCardOnly, setHasCardOnly] = useState(false);

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
    if (hasCardOnly) params.set("hasCard", "true");
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
  }, [committedQuery, bannedOnly, hasVisitsOnly, hasCardOnly, sort, page, status]);

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
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this is a server route, not a page */}
          <a
            href="/api/admin/clients/export/"
            className="inline-flex items-center justify-center rounded-md font-medium tracking-[0.02em] transition-colors duration-150 whitespace-nowrap select-none h-8 px-3 text-[0.8125rem] gap-1.5 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-cream-50)]"
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
                  {hit.banned && <Badge tone="danger" size="sm">Banned</Badge>}
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
          <input type="checkbox" checked={hasCardOnly} onChange={(e) => { setHasCardOnly(e.target.checked); setPage(1); }} className="w-4 h-4" />
          Card on file
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
        <div className="bg-white border border-navy/10 px-6 py-12 text-center">
          <p className="font-heading text-lg text-navy/60 mb-1">No clients match</p>
          <p className="text-sm font-body text-navy/40">
            Try a different search term or clear the filters above.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {clients.map((c) => {
            const emailShown = displayEmail(c.email);
            const tone = avatarTone(c.email);
            const initial = initials(c.name, c.email);
            return (
              <Link
                key={c.email}
                href={`/admin/clients/${encodeURIComponent(c.email)}`}
                className={`group flex items-center gap-4 px-4 sm:px-6 py-4 transition-colors ${c.banned ? "bg-red-50/40 hover:bg-red-50/70" : "hover:bg-navy/[0.02]"}`}
              >
                {/* Avatar tile — colored by email hash for visual continuity */}
                <div className={`shrink-0 h-11 w-11 rounded-full flex items-center justify-center font-heading text-sm ${tone}`} aria-hidden="true">
                  {initial}
                </div>

                {/* Main column — name + identifying badges + contact */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body font-semibold text-sm text-navy group-hover:text-rose truncate transition-colors">
                      {c.name}
                    </span>
                    {c.banned && <Badge tone="danger" size="sm">Banned</Badge>}
                    {c.cardOnFile && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-body uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5"
                        title={
                          c.cardBrand && c.cardLast4
                            ? `${c.cardBrand.toUpperCase()} ending in ${c.cardLast4}`
                            : "Stripe customer on file"
                        }
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <rect x="2" y="6" width="20" height="13" rx="2" />
                          <path d="M2 10h20" />
                        </svg>
                        Card
                        {c.cardLast4 ? <span className="font-mono">···{c.cardLast4}</span> : null}
                      </span>
                    )}
                    {c.noShows > 0 && (
                      <Badge tone="warning" size="sm">
                        {c.noShows} no-show{c.noShows > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-navy/55 text-xs font-body break-all mt-0.5">
                    {emailShown ? (
                      <>{emailShown}{c.phone ? ` · ${c.phone}` : ""}</>
                    ) : (
                      <span className="text-navy/40">{c.phone || "no contact on file"}</span>
                    )}
                  </p>
                  <p className="text-navy/40 text-[11px] font-body mt-1 flex items-center gap-2">
                    <span>
                      Last visit: <span className="text-navy/60">{relativeDate(c.lastVisit)}</span>
                    </span>
                    {c.birthday && (
                      <span className="text-navy/30">· 🎂 {c.birthday}</span>
                    )}
                  </p>
                </div>

                {/* Stats column — spend + visit count */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="font-heading text-base text-green-700 leading-none">
                    {formatCents(c.totalSpent)}
                  </p>
                  <p className="text-[11px] font-body text-navy/45 mt-1">
                    {c.visits} visit{c.visits !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Quick-contact buttons — keep cards self-contained */}
                <div
                  className="hidden md:flex gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {emailShown && (
                    <a
                      href={`mailto:${c.email}`}
                      className="h-7 w-7 inline-flex items-center justify-center text-blue-600 border border-blue-200 hover:bg-blue-50"
                      title="Email"
                      aria-label={`Email ${c.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="h-7 w-7 inline-flex items-center justify-center text-green-600 border border-green-200 hover:bg-green-50"
                      title="Call"
                      aria-label={`Call ${c.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.5a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.27 1.05l-1.9 1.9a16 16 0 006.3 6.3l1.9-1.9a1 1 0 011.05-.27l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.82 21 3 14.18 3 6V5z" />
                      </svg>
                    </a>
                  )}
                </div>
              </Link>
            );
          })}
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
              <h2 className="font-heading text-xl">Import clients</h2>
              {!importing && <button onClick={() => setImportOpen(false)} className="text-navy/40 hover:text-navy text-2xl">&times;</button>}
            </div>
            <p className="text-xs font-body text-navy/60 mb-3">
              Upload a <strong>CSV or Excel (.xls / .xlsx)</strong> file with any of:
              <strong> Name, Email, Phone, Date of Birth, Banned</strong> (column order + case don&apos;t matter).
              Rows are upserted — re-running is safe. Clients without an email still import as long as
              they have a phone number.
            </p>
            {!importResult ? (
              <input
                type="file"
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
