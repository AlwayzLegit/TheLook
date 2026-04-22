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
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffEmailsConfigured, setStaffEmailsConfigured] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

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
    // Banner for missing staff emails.
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const val = (data?.staff_notification_emails || "").trim();
        setStaffEmailsConfigured(val.length > 0);
      })
      .catch(() => setStaffEmailsConfigured(null));
    return () => { active = false; clearInterval(t); };
  }, [status]);

  if (status !== "authenticated") return null;

  const greeting = session?.user?.name ? `Welcome back, ${session.user.name.split(" ")[0]}.` : "Welcome back.";

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
