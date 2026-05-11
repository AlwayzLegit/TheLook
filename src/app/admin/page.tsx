"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TodayTimeline from "@/components/admin/TodayTimeline";
import { Card, Eyebrow } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Sparkline, CHART_COLORS } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/format";

interface Payload {
  today: { date: string; revenue: number; appointments: number; confirmed: number; pending: number; sparkline: number[] };
  trend: {
    revenueWeek: number; revenueWeekPrev: number;
    revenueMonth: number; revenueMonthPrev: number;
    apptsWeek: number; apptsWeekPrev: number;
    apptsMonth: number; apptsMonthPrev: number;
    sparkRevenue: number[];
    sparkAppts: number[];
  };
  timeline: Array<{
    id: string; clientName: string; serviceName: string;
    stylistId: string | null; stylistName: string; stylistColor: string | null;
    start: string; end: string; status: string; requested?: boolean;
  }>;
  workload: Array<{
    stylistId: string; name: string; color: string | null;
    hoursToday: number; apptsToday: number; revenueToday: number; revenueWeek: number;
  }>;
  attention: {
    pending: number;
    pendingUpcoming: number;
    pendingOverdue: number;
    unreadMessages: number;
    waitlist: number;
    lowInventory: number;
  };
  health: { noShows: number; cancellations: number; cancelRate: number; totalWeek: number };
  blog: {
    total: number;
    published: number;
    drafts: number;
    scheduled: number;
    archived: number;
    publishedThisMonth: number;
    latest: {
      id: string;
      slug: string;
      title: string;
      author_name: string;
      published_at: string | null;
      cover_image_url: string | null;
      view_count: number | null;
      category: { slug: string; name: string } | null;
    } | null;
    recentActivity: Array<{
      id: string;
      action: string;
      slug: string | null;
      status: string | null;
      postId: string | null;
      actorEmail: string | null;
      createdAt: string;
    }>;
  };
}

interface AudiencePayload {
  configured: boolean;
  visitorsWeek: number;
  visitorsWeekPrev: number;
  pageviewsWeek: number;
  pageviewsWeekPrev: number;
  pageviewsToday: number;
  pageviewsYesterday: number;
  sparkPageviews: number[];
  sparkVisitors: number[];
  topPages: Array<{ path: string; pageviews: number; visitors: number }>;
  topReferrers: Array<{ domain: string; visits: number }>;
  topDevices: Array<{ device: string; visits: number }>;
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [audience, setAudience] = useState<AudiencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffEmailsConfigured, setStaffEmailsConfigured] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const role = session?.user?.role;
  const permissions = session?.user?.permissions;
  // Banner-loader gate: only fetch /api/admin/settings when the user
  // can actually read it. Falls back to legacy role for sessions that
  // predate the permission rollout.
  const canManageSettings =
    (Array.isArray(permissions) && permissions.includes("manage_settings")) ||
    (!permissions && (role === "admin" || role === "manager"));

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    const load = () => {
      fetch("/api/admin/dashboard")
        .then(async (r) => {
          if (!r.ok) return null;
          try { return await r.json(); } catch { return null; }
        })
        .then((data) => {
          if (!active) return;
          // Only accept a payload that has the shape we expect — a 500
          // returns `{ error }` which would otherwise crash downstream
          // `.trend` / `.attention` reads.
          if (data && typeof data === "object" && "trend" in data && "attention" in data) {
            setPayload(data as Payload);
            setLastUpdate(new Date());
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const t = setInterval(load, 30_000);

    // Audience (PostHog) — separate poll, slower cadence since the upstream
    // route caches for 5 min anyway.
    const loadAudience = () => {
      fetch("/api/admin/analytics/posthog")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data) return;
          if (typeof data === "object" && "configured" in data) {
            setAudience(data as AudiencePayload);
          }
        })
        .catch(() => {});
    };
    loadAudience();
    const t2 = setInterval(loadAudience, 120_000);

    // Banner for missing staff emails. Only fires when the user can
    // actually read /api/admin/settings — otherwise the request 403s
    // and writes a noisy auth.rbac.denied row every dashboard load.
    if (canManageSettings) {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((data) => {
          const val = (data?.staff_notification_emails || "").trim();
          setStaffEmailsConfigured(val.length > 0);
        })
        .catch(() => setStaffEmailsConfigured(null));
    }
    return () => { active = false; clearInterval(t); clearInterval(t2); };
  }, [status, role, canManageSettings]);

  if (status !== "authenticated") return null;

  // Round-9 QA caught the greeting saying "Welcome back, Anna." for
  // a manager session because admin_users.name was seeded as Anna's
  // name on a different account. Prefer the stored display name when
  // it looks aligned with the email (multi-word, or first-word
  // appears in the local-part); otherwise fall back to a label
  // derived from the email so we don't greet the wrong person if
  // that row is mis-seeded again later.
  const greeting = (() => {
    const rawName = (session?.user?.name || "").trim();
    const email = (session?.user?.email || "").trim();
    const localPart = email.split("@")[0] || "";
    const firstWord = rawName.split(/\s+/)[0] || "";
    const aligned =
      rawName.includes(" ") ||
      (firstWord && localPart.toLowerCase().includes(firstWord.toLowerCase()));
    if (firstWord && aligned) return `Welcome back, ${firstWord}.`;
    if (localPart) {
      const chunk = localPart.split(/[._-]+/)[0] || localPart;
      const display = chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
      return `Welcome back, ${display}.`;
    }
    return "Welcome back.";
  })();

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
        <div>
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">
            {greeting}
          </h1>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-1.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {lastUpdate && (
              <span className="ml-3 inline-flex items-center gap-1.5 text-[0.75rem]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin/appointments"
          className="inline-flex items-center justify-center rounded-md font-medium tracking-[0.02em] transition-colors duration-150 whitespace-nowrap select-none h-8 px-3 text-[0.8125rem] gap-1.5 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-cream-50)]"
        >
          Open appointments →
        </Link>
      </div>

      {staffEmailsConfigured === false && (
        <div className="mt-6 flex items-center gap-3 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-4 py-3 text-[0.8125rem] text-[var(--color-warning)]">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.995L13.732 4.005c-.77-1.333-2.694-1.333-3.464 0L3.34 16.005C2.57 17.333 3.532 19 5.072 19z" />
          </svg>
          <span className="flex-1">
            <b>No staff notification emails configured.</b> No one is getting alerted when customers book online.
          </span>
          <Link href="/admin/settings" className="font-medium underline shrink-0">Fix in Settings →</Link>
        </div>
      )}

      {/* ─────── Hero row ─────── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today card */}
        <Card className="lg:col-span-3 flex flex-col" padded={false}>
          <div className="p-5 flex-1">
            <Eyebrow>Today</Eyebrow>
            {loading ? (
              <Skeleton className="h-11 w-28 mt-2" />
            ) : (
              <p className="mt-2 text-[2.25rem] font-heading text-[var(--color-text)] tracking-tight leading-none">
                {formatMoney(payload?.today.revenue ?? 0, { from: "cents" })}
              </p>
            )}
            <p className="mt-1 text-[0.75rem] text-[var(--color-text-muted)]">
              {payload?.today.appointments ?? 0} appointments
              {payload && payload.today.confirmed > 0 && (
                <> · <span className="text-[var(--color-success)]">{payload.today.confirmed} confirmed</span></>
              )}
              {payload && payload.today.pending > 0 && (
                <> · <span className="text-[var(--color-warning)]">{payload.today.pending} pending</span></>
              )}
            </p>
            {payload && payload.today.sparkline.length > 1 && (
              <div className="mt-4">
                <Sparkline values={payload.today.sparkline} color={CHART_COLORS[1]} height={36} />
                <p className="mt-1 text-[0.6875rem] uppercase tracking-wider text-[var(--color-text-subtle)]">7-day revenue</p>
              </div>
            )}
          </div>
        </Card>

        {/* Today's timeline */}
        <Card className="lg:col-span-6" padded={false}>
          <div className="px-5 pt-4 pb-1 flex items-center justify-between">
            <Eyebrow>Today&apos;s timeline</Eyebrow>
            <Link href="/admin/appointments" className="text-[0.75rem] text-[var(--color-crimson-600)] hover:underline">
              Open →
            </Link>
          </div>
          <div className="p-5 pt-2">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <TodayTimeline appointments={payload?.timeline || []} />
            )}
          </div>
        </Card>

        {/* Needs attention */}
        <Card className="lg:col-span-3">
          <Eyebrow>Needs attention</Eyebrow>
          <div className="mt-3 space-y-2">
            {/* Pending split into upcoming vs overdue. Each link pre-sets
                the appointments page's history window + filters so the
                rows we counted here are the rows that render there. */}
            <AttentionRow
              label={`${payload?.attention.pendingUpcoming ?? 0} upcoming pending`}
              href="/admin/appointments?status=pending&range=upcoming"
              count={payload?.attention.pendingUpcoming ?? 0}
              tone="warning"
            />
            <AttentionRow
              label={`${payload?.attention.pendingOverdue ?? 0} overdue pending`}
              href="/admin/appointments?status=pending&overdue=true&range=past90"
              count={payload?.attention.pendingOverdue ?? 0}
              tone="danger"
            />
            <AttentionRow
              label={`${payload?.attention.unreadMessages ?? 0} message${(payload?.attention.unreadMessages ?? 0) === 1 ? "" : "s"}`}
              href="/admin/messages"
              count={payload?.attention.unreadMessages ?? 0}
              tone="info"
            />
            <AttentionRow
              label={`${payload?.attention.waitlist ?? 0} on the waitlist`}
              href="/admin/waitlist"
              count={payload?.attention.waitlist ?? 0}
              tone="accent"
            />
            <AttentionRow
              label={`${payload?.attention.lowInventory ?? 0} low-stock product${(payload?.attention.lowInventory ?? 0) === 1 ? "" : "s"}`}
              href="/admin/products"
              count={payload?.attention.lowInventory ?? 0}
              tone="danger"
            />
          </div>
        </Card>
      </div>

      {/* ─────── Trend row ─────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue · week"
          value={loading ? <Skeleton className="h-8 w-24" /> : formatMoney(payload?.trend.revenueWeek ?? 0, { from: "cents" })}
          delta={payload ? deltaPct(payload.trend.revenueWeek, payload.trend.revenueWeekPrev) : null}
          deltaLabel="vs previous week"
          sparkline={payload ? <Sparkline values={payload.trend.sparkRevenue} color={CHART_COLORS[1]} /> : undefined}
        />
        <StatCard
          label="Revenue · month"
          value={loading ? <Skeleton className="h-8 w-24" /> : formatMoney(payload?.trend.revenueMonth ?? 0, { from: "cents" })}
          delta={payload ? deltaPct(payload.trend.revenueMonth, payload.trend.revenueMonthPrev) : null}
          deltaLabel="vs previous month"
          sparkline={payload ? <Sparkline values={payload.trend.sparkRevenue} color={CHART_COLORS[2]} /> : undefined}
        />
        <StatCard
          label="Appointments · week"
          value={loading ? <Skeleton className="h-8 w-16" /> : (payload?.trend.apptsWeek ?? 0).toLocaleString()}
          delta={payload ? deltaPct(payload.trend.apptsWeek, payload.trend.apptsWeekPrev) : null}
          deltaLabel="vs previous week"
          sparkline={payload ? <Sparkline values={payload.trend.sparkAppts} color={CHART_COLORS[3]} /> : undefined}
        />
        <StatCard
          label="Appointments · month"
          value={loading ? <Skeleton className="h-8 w-16" /> : (payload?.trend.apptsMonth ?? 0).toLocaleString()}
          delta={payload ? deltaPct(payload.trend.apptsMonth, payload.trend.apptsMonthPrev) : null}
          deltaLabel="vs previous month"
          sparkline={payload ? <Sparkline values={payload.trend.sparkAppts} color={CHART_COLORS[0]} /> : undefined}
        />
      </div>

      {/* ─────── Audience row (PostHog) ─────── */}
      {audience && audience.configured && (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Visitors · week"
              value={audience.visitorsWeek.toLocaleString()}
              delta={deltaPct(audience.visitorsWeek, audience.visitorsWeekPrev)}
              deltaLabel="vs previous week"
              sparkline={<Sparkline values={audience.sparkVisitors} color={CHART_COLORS[1]} />}
            />
            <StatCard
              label="Pageviews · week"
              value={audience.pageviewsWeek.toLocaleString()}
              delta={deltaPct(audience.pageviewsWeek, audience.pageviewsWeekPrev)}
              deltaLabel="vs previous week"
              sparkline={<Sparkline values={audience.sparkPageviews} color={CHART_COLORS[2]} />}
            />
            <StatCard
              label="Pageviews · today"
              value={audience.pageviewsToday.toLocaleString()}
              delta={deltaPct(audience.pageviewsToday, audience.pageviewsYesterday)}
              deltaLabel="vs yesterday"
            />
            <StatCard
              label="Pageviews / visitor"
              value={(audience.visitorsWeek > 0
                ? (audience.pageviewsWeek / audience.visitorsWeek)
                : 0
              ).toFixed(1)}
              hint="Last 7 days"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <Eyebrow>Top pages · 7d</Eyebrow>
              {audience.topPages.length === 0 ? (
                <EmptyState compact title="No pageviews yet" />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {audience.topPages.map((p) => (
                    <li key={p.path} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[var(--color-text)]" title={p.path}>{p.path}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">
                        {p.pageviews.toLocaleString()}
                        <span className="text-[var(--color-text-subtle)] ml-1">· {p.visitors.toLocaleString()}u</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <Eyebrow>Top referrers · 7d</Eyebrow>
              {audience.topReferrers.length === 0 ? (
                <EmptyState compact title="No referrers yet" description="Most visits still coming direct." />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {audience.topReferrers.map((r) => (
                    <li key={r.domain} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[var(--color-text)]" title={r.domain}>{r.domain}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">{r.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <Eyebrow>Devices · 7d</Eyebrow>
              {audience.topDevices.length === 0 ? (
                <EmptyState compact title="No device data yet" />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {audience.topDevices.map((d) => (
                    <li key={d.device} className="flex items-baseline justify-between gap-3">
                      <span className="capitalize text-[var(--color-text)]">{d.device}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">{d.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ─────── Operational row ─────── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health */}
        <Card>
          <Eyebrow>This week&apos;s health</Eyebrow>
          <dl className="mt-4 divide-y divide-[var(--color-border)]">
            <HealthRow label="No-shows" value={payload?.health.noShows ?? 0} tone={(payload?.health.noShows ?? 0) > 0 ? "warning" : "success"} />
            <HealthRow label="Cancellations" value={payload?.health.cancellations ?? 0} tone={(payload?.health.cancellations ?? 0) > 0 ? "warning" : "success"} />
            <HealthRow
              label="Cancel rate"
              value={`${payload?.health.cancelRate ?? 0}%`}
              tone={(payload?.health.cancelRate ?? 0) > 15 ? "danger" : (payload?.health.cancelRate ?? 0) > 5 ? "warning" : "success"}
              subtle={`across ${payload?.health.totalWeek ?? 0} bookings`}
            />
          </dl>
        </Card>

        {/* Stylist workload today */}
        <Card>
          <Eyebrow>Stylist workload · today</Eyebrow>
          {loading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : !payload?.workload.length || payload.workload.every((w) => w.hoursToday === 0) ? (
            <EmptyState compact title="No appointments today" description="Your schedule is clear." />
          ) : (
            <StylistBars
              rows={payload.workload.filter((w) => w.hoursToday > 0)}
              valueFor={(r) => r.hoursToday}
              formatValue={(v) => `${v.toFixed(1)}h`}
              hint={(r) => `${r.apptsToday} appt${r.apptsToday === 1 ? "" : "s"}`}
            />
          )}
        </Card>

        {/* Revenue by stylist — this week */}
        <Card>
          <Eyebrow>Revenue by stylist · week</Eyebrow>
          {loading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : !payload?.workload.length || payload.workload.every((w) => w.revenueWeek === 0) ? (
            <EmptyState compact title="No revenue yet" description="Revenue appears once a booking is confirmed or completed." />
          ) : (
            <StylistBars
              rows={[...payload.workload].filter((w) => w.revenueWeek > 0).sort((a, b) => b.revenueWeek - a.revenueWeek)}
              valueFor={(r) => r.revenueWeek}
              formatValue={(v) => formatMoney(v, { from: "cents" })}
            />
          )}
        </Card>
      </div>

      {/* ─────── Blog row ─────── */}
      <BlogRow blog={payload?.blog} loading={loading} />
    </div>
  );
}

function AttentionRow({
  label, href, count, tone,
}: {
  label: string;
  href: string;
  count: number;
  tone: "warning" | "info" | "accent" | "danger";
}) {
  const muted = count === 0;
  return (
    <Link
      href={href}
      className={
        "group flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 transition-colors " +
        (muted ? "bg-[var(--color-cream-50)]" : "bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]")
      }
    >
      <span className="flex items-center gap-2">
        <span
          className={
            "h-1.5 w-1.5 rounded-full " +
            (muted
              ? "bg-[var(--color-text-subtle)]"
              : tone === "warning"
                ? "bg-[var(--color-warning)]"
                : tone === "danger"
                  ? "bg-[var(--color-danger)]"
                  : tone === "accent"
                    ? "bg-[var(--color-crimson-600)]"
                    : "bg-[var(--color-info)]")
          }
          aria-hidden
        />
        <span className={"text-[0.8125rem] " + (muted ? "text-[var(--color-text-subtle)]" : "text-[var(--color-text)]")}>{label}</span>
      </span>
      <svg className={"h-3.5 w-3.5 " + (muted ? "text-[var(--color-text-subtle)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]")} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function HealthRow({ label, value, tone, subtle }: { label: string; value: number | string; tone: "success" | "warning" | "danger"; subtle?: string }) {
  const col = tone === "danger" ? "var(--color-danger)" : tone === "warning" ? "var(--color-warning)" : "var(--color-success)";
  return (
    <div className="flex items-baseline justify-between py-2.5 first:pt-0 last:pb-0">
      <div>
        <dt className="text-[0.8125rem] text-[var(--color-text)]">{label}</dt>
        {subtle && <p className="text-[0.6875rem] text-[var(--color-text-subtle)]">{subtle}</p>}
      </div>
      <dd className="text-[1rem] font-medium" style={{ color: col }}>{value}</dd>
    </div>
  );
}

function StylistBars<T extends { stylistId: string; name: string; color: string | null }>(
  { rows, valueFor, formatValue, hint }: {
    rows: T[];
    valueFor: (r: T) => number;
    formatValue: (v: number) => string;
    hint?: (r: T) => string;
  },
) {
  const max = Math.max(1, ...rows.map(valueFor));
  return (
    <ul className="mt-4 space-y-2.5">
      {rows.map((r) => {
        const v = valueFor(r);
        const pct = Math.round((v / max) * 100);
        return (
          <li key={r.stylistId}>
            <div className="flex items-baseline justify-between text-[0.8125rem] mb-1">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.color || "var(--color-text-subtle)" }} aria-hidden />
                <span className="truncate text-[var(--color-text)]">{r.name}</span>
              </span>
              <span className="text-[var(--color-text-muted)] tabular-nums">{formatValue(v)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-cream-200)]/60 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: r.color || "var(--color-text-muted)" }} />
            </div>
            {hint && <p className="mt-1 text-[0.6875rem] text-[var(--color-text-subtle)]">{hint(r)}</p>}
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────
// Blog row — pipeline stats, latest published post, recent activity
// ─────────────────────────────────────────────────────────────────

type BlogBlock = Payload["blog"];

function BlogRow({ blog, loading }: { blog: BlogBlock | undefined; loading: boolean }) {
  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-6">
      {/* Latest + 4-up stat band */}
      <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <Eyebrow>Blog · latest</Eyebrow>
          <Link
            href="/admin/blog"
            className="text-[0.6875rem] uppercase tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Manage →
          </Link>
        </div>
        {loading ? (
          <div className="px-5 pb-5"><Skeleton className="h-32 w-full" /></div>
        ) : !blog?.latest ? (
          <div className="px-5 pb-5">
            <EmptyState
              compact
              title="No published posts yet"
              description="Write your first post to start ranking on long-tail hair queries."
              action={<Link href="/admin/blog/new" className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-5 py-2">New post</Link>}
            />
          </div>
        ) : (
          <Link
            href={`/blog/${blog.latest.slug}`}
            className="group flex gap-4 px-5 pb-4 hover:bg-[var(--color-cream-50)] transition-colors"
          >
            {blog.latest.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blog.latest.cover_image_url}
                alt=""
                className="h-20 w-32 object-cover rounded shrink-0 border border-[var(--color-border)]"
                loading="lazy"
              />
            ) : (
              <div className="h-20 w-32 rounded shrink-0 bg-gradient-to-br from-navy/10 to-gold/10" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              {blog.latest.category ? (
                <p className="text-[0.6875rem] uppercase tracking-[0.15em] text-[var(--color-accent-gold)]">
                  {blog.latest.category.name}
                </p>
              ) : null}
              <p className="font-heading text-base text-[var(--color-text)] group-hover:text-rose transition-colors mt-0.5 line-clamp-2">
                {blog.latest.title}
              </p>
              <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-1">
                {blog.latest.author_name}
                {blog.latest.published_at ? ` · ${formatRelativeDate(blog.latest.published_at)}` : ""}
              </p>
            </div>
          </Link>
        )}

        <dl className="grid grid-cols-4 border-t border-[var(--color-border)] divide-x divide-[var(--color-border)] text-center">
          <BlogStat label="Published" value={blog?.published} loading={loading} />
          <BlogStat label="Drafts" value={blog?.drafts} loading={loading} />
          <BlogStat label="Scheduled" value={blog?.scheduled} loading={loading} />
          <BlogStat label="This month" value={blog?.publishedThisMonth} loading={loading} highlight />
        </dl>
      </Card>

      {/* Recent activity */}
      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between">
          <Eyebrow>Blog activity</Eyebrow>
          <Link
            href="/admin/activity"
            className="text-[0.6875rem] uppercase tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Full log →
          </Link>
        </div>
        {loading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        ) : !blog?.recentActivity.length ? (
          <EmptyState compact title="No blog activity yet" description="Publishing actions will show up here." />
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {blog.recentActivity.map((row) => (
              <li key={row.id} className="py-2 flex items-baseline gap-3">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-text-subtle)] tabular-nums shrink-0 w-12">
                  {formatRelativeShort(row.createdAt)}
                </span>
                <span className="text-[0.8125rem] text-[var(--color-text)] flex-1 min-w-0 truncate">
                  <span className="text-[var(--color-text-muted)]">{describeBlogAction(row.action)}</span>
                  {row.slug ? (
                    <Link
                      href={row.action.startsWith("blog.category") ? "/admin/blog/categories" : (row.postId ? `/admin/blog/${row.postId}` : `/admin/blog`)}
                      className="ml-1.5 font-mono text-[0.75rem] hover:text-rose"
                    >
                      /{row.slug}
                    </Link>
                  ) : null}
                </span>
                {row.actorEmail ? (
                  <span className="text-[0.6875rem] text-[var(--color-text-subtle)] truncate max-w-[140px]" title={row.actorEmail}>
                    {row.actorEmail.split("@")[0]}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function BlogStat({ label, value, loading, highlight }: { label: string; value: number | undefined; loading: boolean; highlight?: boolean }) {
  return (
    <div className="px-3 py-3">
      <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">{label}</dt>
      <dd className={`mt-1 text-xl font-heading tabular-nums ${highlight ? "text-rose" : "text-[var(--color-text)]"}`}>
        {loading ? <Skeleton className="h-6 w-10 mx-auto" /> : (value ?? 0).toLocaleString()}
      </dd>
    </div>
  );
}

// "blog.post.upsert" / "blog.post.update" / "blog.post.delete" /
// "blog.category.upsert" / "blog.category.update" / "blog.category.delete"
function describeBlogAction(action: string): string {
  switch (action) {
    case "blog.post.upsert": return "Saved post";
    case "blog.post.update": return "Updated post";
    case "blog.post.delete": return "Deleted post";
    case "blog.category.upsert": return "Saved category";
    case "blog.category.update": return "Updated category";
    case "blog.category.delete": return "Deleted category";
    default: return action;
  }
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) {
    const m = Math.max(1, Math.floor(diffMs / 60_000));
    return `${m}m ago`;
  }
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeShort(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return "now";
  if (diffM < 60) return `${diffM}m`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}
