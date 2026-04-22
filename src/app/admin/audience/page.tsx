"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Chart, Sparkline, CHART_COLORS } from "@/components/ui/Chart";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented, SegmentedList, SegmentedItem } from "@/components/ui/Tabs";

interface AudiencePayload {
  configured: boolean;
  rangeDays: number;
  visitors: number;
  pageviews: number;
  visitorsPrev: number;
  pageviewsPrev: number;
  pageviewsPerVisitor: number;
  seriesPageviews: number[];
  seriesVisitors: number[];
  seriesDates: string[];
  topPages: Array<{ path: string; pageviews: number; visitors: number; avgTimeS: number }>;
  topReferrers: Array<{ domain: string; visits: number; visitors: number }>;
  topDevices: Array<{ device: string; visits: number }>;
  topCountries: Array<{ country: string; visits: number }>;
  topBrowsers: Array<{ browser: string; visits: number }>;
  bookingFunnel: Array<{ step: string; label: string; visitors: number; dropPct: number | null }>;
  topEvents: Array<{ event: string; count: number }>;
  bookingsSubmitted: number;
  depositPaid: number;
  contactsSubmitted: number;
  smsOptInRate: number | null;
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export default function AudiencePage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AudiencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch(`/api/admin/analytics/audience?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object" && "configured" in d) {
          setData(d as AudiencePayload);
        }
      })
      .finally(() => setLoading(false));
  }, [status, days]);

  if (status !== "authenticated") return null;

  const series = (data?.seriesDates || []).map((date, i) => ({
    date: date.slice(5),
    pageviews: data?.seriesPageviews[i] || 0,
    visitors: data?.seriesVisitors[i] || 0,
  }));

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Eyebrow>Analytics</Eyebrow>
          <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">
            Website audience
          </h1>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-1.5">
            Visitors, top pages, and booking-funnel conversion from PostHog.
          </p>
        </div>
        <Segmented value={String(days)} onValueChange={(v) => setDays(parseInt(v, 10) || 30)}>
          <SegmentedList>
            <SegmentedItem value="7">7d</SegmentedItem>
            <SegmentedItem value="30">30d</SegmentedItem>
            <SegmentedItem value="90">90d</SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <Card>
          <EmptyState title="No data" description="Could not load audience report." />
        </Card>
      ) : !data.configured ? (
        <Card>
          <EmptyState
            title="PostHog not connected"
            description="Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST in Vercel env vars, then redeploy."
          />
        </Card>
      ) : (
        <>
          {/* Topline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label={`Visitors · ${days}d`}
              value={data.visitors.toLocaleString()}
              delta={deltaPct(data.visitors, data.visitorsPrev)}
              deltaLabel={`vs previous ${days}d`}
              sparkline={<Sparkline values={data.seriesVisitors} color={CHART_COLORS[1]} />}
            />
            <StatCard
              label={`Pageviews · ${days}d`}
              value={data.pageviews.toLocaleString()}
              delta={deltaPct(data.pageviews, data.pageviewsPrev)}
              deltaLabel={`vs previous ${days}d`}
              sparkline={<Sparkline values={data.seriesPageviews} color={CHART_COLORS[2]} />}
            />
            <StatCard
              label="Pageviews / visitor"
              value={data.pageviewsPerVisitor.toFixed(1)}
              hint="Avg session depth"
            />
            <StatCard
              label="Booking submits"
              value={data.bookingsSubmitted.toLocaleString()}
              hint={
                data.visitors > 0
                  ? `${((data.bookingsSubmitted / data.visitors) * 100).toFixed(2)}% of visitors`
                  : "0 visitors"
              }
            />
          </div>

          {/* Traffic chart */}
          <Card className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Traffic · {days}d</Eyebrow>
              <span className="text-[0.75rem] text-[var(--color-text-subtle)]">pageviews vs visitors</span>
            </div>
            {series.length === 0 ? (
              <EmptyState compact title="No traffic yet" />
            ) : (
              <Chart
                data={series}
                dataKey="date"
                series={[
                  { key: "pageviews", label: "Pageviews", color: CHART_COLORS[1] },
                  { key: "visitors",  label: "Visitors",  color: CHART_COLORS[3] },
                ]}
                kind="area"
                height={260}
              />
            )}
          </Card>

          {/* Booking funnel */}
          <Card className="mt-6">
            <Eyebrow>Booking funnel · {days}d</Eyebrow>
            <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5 mb-4">
              Unique visitors who reached each step of /book (and, at the bottom,
              who finished).
            </p>
            {data.bookingFunnel.every((s) => s.visitors === 0) ? (
              <EmptyState
                compact
                title="No booking activity yet"
                description="Funnel populates as soon as anyone opens /book. Give it a day of traffic."
              />
            ) : (
              <FunnelList steps={data.bookingFunnel} />
            )}
          </Card>

          {/* Two-up: pages + referrers */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Eyebrow>Top pages</Eyebrow>
              {data.topPages.length === 0 ? (
                <EmptyState compact title="No pageviews yet" />
              ) : (
                <table className="mt-3 w-full text-[0.8125rem]">
                  <thead>
                    <tr className="text-left text-[var(--color-text-subtle)] text-[0.6875rem] uppercase tracking-wider">
                      <th className="py-1.5 font-normal">Path</th>
                      <th className="py-1.5 font-normal text-right">Pageviews</th>
                      <th className="py-1.5 font-normal text-right">Visitors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {data.topPages.map((p) => (
                      <tr key={p.path}>
                        <td className="py-2 truncate max-w-[320px]" title={p.path}>{p.path}</td>
                        <td className="py-2 text-right tabular-nums">{p.pageviews.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums text-[var(--color-text-muted)]">{p.visitors.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card>
              <Eyebrow>Top referrers</Eyebrow>
              {data.topReferrers.length === 0 ? (
                <EmptyState compact title="No referrers yet" description="Most visits are coming direct right now." />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {data.topReferrers.map((r) => (
                    <li key={r.domain} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[var(--color-text)]" title={r.domain}>{r.domain}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">
                        {r.visits.toLocaleString()}
                        <span className="text-[var(--color-text-subtle)] ml-1">· {r.visitors.toLocaleString()}u</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Three-up: devices / browsers / countries */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Eyebrow>Devices</Eyebrow>
              {data.topDevices.length === 0 ? (
                <EmptyState compact title="No device data" />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {data.topDevices.map((d) => (
                    <li key={d.device} className="flex items-baseline justify-between gap-3">
                      <span className="capitalize">{d.device}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums">{d.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <Eyebrow>Browsers</Eyebrow>
              {data.topBrowsers.length === 0 ? (
                <EmptyState compact title="No browser data" />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {data.topBrowsers.map((b) => (
                    <li key={b.browser} className="flex items-baseline justify-between gap-3">
                      <span>{b.browser}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums">{b.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <Eyebrow>Countries</Eyebrow>
              {data.topCountries.length === 0 ? (
                <EmptyState compact title="No country data" />
              ) : (
                <ul className="mt-3 space-y-2 text-[0.8125rem]">
                  {data.topCountries.map((c) => (
                    <li key={c.country} className="flex items-baseline justify-between gap-3">
                      <span className="truncate" title={c.country}>{c.country}</span>
                      <span className="text-[var(--color-text-muted)] tabular-nums">{c.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Conversion events row */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Eyebrow>Contact form · {days}d</Eyebrow>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-heading text-[2rem] text-[var(--color-text)] leading-none">
                  {data.contactsSubmitted.toLocaleString()}
                </span>
                <span className="text-[0.75rem] text-[var(--color-text-muted)]">submits</span>
              </div>
              {data.smsOptInRate != null && (
                <p className="mt-2 text-[0.75rem] text-[var(--color-text-muted)]">
                  <strong className="text-[var(--color-text)]">{data.smsOptInRate.toFixed(0)}%</strong>
                  {" "}opted in to SMS
                </p>
              )}
            </Card>
            <Card>
              <Eyebrow>Deposits paid · {days}d</Eyebrow>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-heading text-[2rem] text-[var(--color-text)] leading-none">
                  {data.depositPaid.toLocaleString()}
                </span>
                <span className="text-[0.75rem] text-[var(--color-text-muted)]">successful</span>
              </div>
              <p className="mt-2 text-[0.75rem] text-[var(--color-text-muted)]">
                Counts Stripe deposit confirmations from /book.
              </p>
            </Card>
            <Card>
              <Eyebrow>All custom events · {days}d</Eyebrow>
              {data.topEvents.length === 0 ? (
                <EmptyState compact title="No events yet" />
              ) : (
                <ul className="mt-3 space-y-1.5 text-[0.8125rem]">
                  {data.topEvents.slice(0, 8).map((e) => (
                    <li key={e.event} className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-mono text-[0.75rem] text-[var(--color-text-muted)]" title={e.event}>{e.event}</span>
                      <span className="tabular-nums">{e.count.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelList({ steps }: { steps: AudiencePayload["bookingFunnel"] }) {
  const max = Math.max(1, ...steps.map((s) => s.visitors));
  return (
    <ul className="space-y-3">
      {steps.map((s, i) => {
        const pct = Math.round((s.visitors / max) * 100);
        return (
          <li key={s.step}>
            <div className="flex items-baseline justify-between text-[0.8125rem] mb-1">
              <span className="text-[var(--color-text)]">
                <span className="text-[var(--color-text-subtle)] mr-1.5">{i + 1}.</span>
                {s.label}
              </span>
              <span className="tabular-nums">
                {s.visitors.toLocaleString()}
                {s.dropPct != null && (
                  <span className={`ml-2 text-[0.6875rem] ${s.dropPct > 50 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
                    {s.dropPct > 0 ? `−${s.dropPct.toFixed(0)}%` : "0%"}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-cream-200)]/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-crimson-600)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
