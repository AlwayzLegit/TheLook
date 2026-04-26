"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Operator dashboard for production errors. Pulls recent issues from
// Sentry via /api/admin/errors (which proxies the Sentry REST API), so
// the owner can see what's broken without leaving the salon admin
// shell. Click an issue → opens the full stack trace + breadcrumbs in
// the Sentry web app.
//
// This view is for *visibility*. For *push notifications* on new
// errors (email / Slack / SMS), set them up in Sentry → Alerts →
// Create Alert. Sentry has the infrastructure to handle delivery
// reliability + retries + escalations, which we'd be re-inventing
// here.

interface ErrorIssue {
  id: string;
  title: string;
  culprit: string | null;
  level: "fatal" | "error" | "warning" | "info" | "debug";
  status: "unresolved" | "resolved" | "ignored";
  count: string;
  userCount: number;
  lastSeen: string;
  firstSeen: string;
  permalink: string;
  type: string | null;
  value: string | null;
  filename: string | null;
}

// Sentry's project-issues endpoint is strict about statsPeriod values
// — round-7 QA found it rejects "1h" / "30d" as "Invalid stats_period".
// The accepted values for issues are 24h / 7d / 14d. Keep this list
// in sync with what Sentry actually allows OR the API proxy will
// surface a red banner. The proxy ALSO defensively normalises any
// other value to "24h" so future client changes degrade gracefully.
const PERIOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
];

const QUERY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "is:unresolved", label: "Unresolved" },
  { value: "is:unresolved level:error", label: "Errors only" },
  { value: "is:unresolved level:fatal", label: "Fatal only" },
  { value: "", label: "All (incl. resolved)" },
];

function levelTone(level: ErrorIssue["level"]): "danger" | "warning" | "info" | "neutral" {
  if (level === "fatal" || level === "error") return "danger";
  if (level === "warning") return "warning";
  if (level === "info") return "info";
  return "neutral";
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function AdminErrorsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [issues, setIssues] = useState<ErrorIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("24h");
  const [query, setQuery] = useState<string>("is:unresolved");
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/admin/errors?period=${encodeURIComponent(period)}&query=${encodeURIComponent(query)}`,
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Failed to load Sentry issues.");
          return;
        }
        setError(null);
        setConfigMessage(data.configured === false ? data.message : data.message || null);
        setIssues(Array.isArray(data.issues) ? data.issues : []);
        setLastFetched(new Date());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Auto-refresh every 60s so the dashboard stays current without
    // hammering Sentry. New events from a fresh deploy show up within
    // the next poll cycle.
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, period, query]);

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Eyebrow>Observability</Eyebrow>
          <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">
            Errors
          </h1>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2 max-w-xl">
            Live feed of production errors captured by Sentry. Click any
            issue to see the full stack trace and the steps that led to
            it. For push notifications when something breaks, configure
            an alert rule at{" "}
            <a
              href="https://jetnine.sentry.io/alerts/rules/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-crimson-600)] underline"
            >
              jetnine.sentry.io/alerts/rules/
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-navy/20 bg-white px-3 py-2 text-sm font-body"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border border-navy/20 bg-white px-3 py-2 text-sm font-body"
          >
            {QUERY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {configMessage && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm font-body text-amber-900 mb-4">
          {configMessage}
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 p-3 rounded text-sm font-body text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading && issues.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">Loading recent errors…</p>
      ) : issues.length === 0 && !configMessage ? (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded text-center">
          <p className="font-heading text-xl text-emerald-900 mb-2">All clear</p>
          <p className="text-sm font-body text-emerald-800/80">
            No {query.includes("unresolved") ? "unresolved " : ""}issues in the {PERIOD_OPTIONS.find((p) => p.value === period)?.label.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {issues.map((issue) => (
            <a
              key={issue.id}
              href={issue.permalink}
              target="_blank"
              rel="noreferrer"
              className="block px-5 py-4 hover:bg-navy/[0.02] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge tone={levelTone(issue.level)} size="sm">
                      {issue.level}
                    </Badge>
                    {issue.status !== "unresolved" && (
                      <Badge tone="neutral" size="sm">
                        {issue.status}
                      </Badge>
                    )}
                    <span className="text-[0.7rem] font-mono text-navy/40">
                      {issue.count} event{issue.count === "1" ? "" : "s"}
                      {issue.userCount > 0 && ` · ${issue.userCount} user${issue.userCount === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <p className="font-body font-semibold text-sm text-navy truncate">
                    {issue.title}
                  </p>
                  {(issue.culprit || issue.filename) && (
                    <p className="text-xs font-mono text-navy/50 truncate mt-0.5">
                      {issue.culprit || issue.filename}
                    </p>
                  )}
                  {issue.value && issue.value !== issue.title && (
                    <p className="text-xs font-body text-navy/60 mt-1 line-clamp-2">{issue.value}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-body text-navy/60 whitespace-nowrap">
                    {relativeTime(issue.lastSeen)}
                  </p>
                  <p className="text-[0.7rem] font-mono text-navy/40 whitespace-nowrap mt-0.5">
                    first {relativeTime(issue.firstSeen)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {lastFetched && (
        <p className="text-[0.7rem] font-mono text-navy/40 mt-4 text-right">
          Updated {lastFetched.toLocaleTimeString()} · auto-refreshes every 60s
        </p>
      )}

      <div className="mt-8 bg-cream/50 border border-navy/10 p-4 rounded text-sm font-body text-navy/70 leading-relaxed">
        <p className="font-semibold text-navy mb-2">How notifications work</p>
        <p className="mb-2">
          This page is the in-app feed. For real-time alerts (email, SMS,
          Slack, push), set them up directly in Sentry — they handle the
          delivery infrastructure. Recommended baseline:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-xs">
          <li><strong>First-seen Error:</strong> notify on any new issue with level=error or higher.</li>
          <li><strong>Webhook fail:</strong> alert on any new issue tagged transaction:/api/stripe/webhook — payments can fail silently.</li>
          <li><strong>Booking fail:</strong> alert on transaction:/api/appointments + level:error — customer can&apos;t book.</li>
          <li><strong>Spike:</strong> Slack/SMS when one issue exceeds 10 events in 5 minutes (catches a regression deploy).</li>
        </ul>
        <p className="mt-3">
          Set them up at{" "}
          <a
            href="https://jetnine.sentry.io/alerts/rules/"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-crimson-600)] underline"
          >
            jetnine.sentry.io/alerts/rules/
          </a>
          {" — "}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open("https://jetnine.sentry.io/alerts/new/issue/?project=thelook-prod", "_blank")}
          >
            Create alert in Sentry →
          </Button>
        </p>
      </div>
    </div>
  );
}
