import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { hasPostHogConfig, queryPostHog } from "@/lib/posthog";

// Detailed PostHog report that powers /admin/audience. Range is
// configurable via ?days=N (default 30, max 180). All queries are
// bucketed server-side so the page just renders the payload.
//
// Cached at the edge for 5 minutes — the dashboard polls but users
// flipping between pages shouldn't each hit PostHog.
export const revalidate = 300;

type SeriesRow = [string, number, number];        // [day, pageviews, visitors]
type PathRow = [string, number, number, number];  // [pathname, pageviews, visitors, avg_time_s]
type DomainRow = [string, number, number];        // [domain, visits, unique_visitors]
type DeviceRow = [string, number];
type CountryRow = [string | null, number];
type BrowserRow = [string | null, number];
type FunnelRow = [string, number];                // [step, unique_visitors]
type EventRow = [string, number];                 // [event_name, count]

interface AudienceReport {
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

const EMPTY: AudienceReport = {
  configured: false,
  rangeDays: 30,
  visitors: 0, pageviews: 0, visitorsPrev: 0, pageviewsPrev: 0, pageviewsPerVisitor: 0,
  seriesPageviews: [], seriesVisitors: [], seriesDates: [],
  topPages: [], topReferrers: [], topDevices: [], topCountries: [], topBrowsers: [],
  bookingFunnel: [], topEvents: [],
  bookingsSubmitted: 0, depositPaid: 0, contactsSubmitted: 0, smsOptInRate: null,
};

// Order & human labels for the /book funnel.
const FUNNEL_STEPS: Array<{ key: string; label: string }> = [
  { key: "service",  label: "Viewed /book (service picker)" },
  { key: "datetime", label: "Picked a date & time" },
  { key: "stylist",  label: "Picked a stylist" },
  { key: "info",     label: "Filled client info" },
  { key: "confirm",  label: "Reached confirm step" },
  { key: "done",     label: "Booking succeeded" },
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);

  const daysParam = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  const days = Math.max(1, Math.min(180, Number.isFinite(daysParam) ? daysParam : 30));

  if (!hasPostHogConfig) {
    return apiSuccess({ ...EMPTY, rangeDays: days });
  }

  // Stepped HogQL. INTERVAL values are interpolated directly because
  // they're integer-guarded above — HogQL doesn't bind params.
  const seriesQ = `
    SELECT toDate(timestamp) AS day, count() AS pageviews, uniq(distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days * 2} DAY
    GROUP BY day ORDER BY day ASC
  `;

  const pagesQ = `
    SELECT properties.$pathname AS path,
           count() AS pageviews,
           uniq(distinct_id) AS visitors,
           round(avg(coalesce(properties.$session_duration, 0))) AS avg_time_s
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY path ORDER BY pageviews DESC LIMIT 20
  `;

  const refsQ = `
    SELECT properties.$referring_domain AS domain,
           count() AS visits,
           uniq(distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$referring_domain IS NOT NULL
      AND properties.$referring_domain != ''
      AND properties.$referring_domain != '$direct'
    GROUP BY domain ORDER BY visits DESC LIMIT 10
  `;

  const devicesQ = `
    SELECT coalesce(properties.$device_type, 'unknown') AS device, count() AS visits
    FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY device ORDER BY visits DESC LIMIT 6
  `;

  const countriesQ = `
    SELECT properties.$geoip_country_name AS country, count() AS visits
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$geoip_country_name IS NOT NULL
    GROUP BY country ORDER BY visits DESC LIMIT 8
  `;

  const browsersQ = `
    SELECT properties.$browser AS browser, count() AS visits
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$browser IS NOT NULL
    GROUP BY browser ORDER BY visits DESC LIMIT 6
  `;

  const funnelQ = `
    SELECT coalesce(properties.step, 'unknown') AS step,
           uniq(distinct_id) AS visitors
    FROM events
    WHERE event = 'booking_step_viewed' AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY step
  `;

  const eventsQ = `
    SELECT event, count() AS c
    FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY
      AND event NOT IN ('$pageview', '$autocapture', '$pageleave', '$identify', '$groupidentify', '$feature_flag_called')
    GROUP BY event ORDER BY c DESC LIMIT 12
  `;

  const [series, pages, refs, devices, countries, browsers, funnel, events] = await Promise.all([
    queryPostHog<SeriesRow>(seriesQ),
    queryPostHog<PathRow>(pagesQ),
    queryPostHog<DomainRow>(refsQ),
    queryPostHog<DeviceRow>(devicesQ),
    queryPostHog<CountryRow>(countriesQ),
    queryPostHog<BrowserRow>(browsersQ),
    queryPostHog<FunnelRow>(funnelQ),
    queryPostHog<EventRow>(eventsQ),
  ]);

  if (!series) return apiSuccess({ ...EMPTY, configured: true, rangeDays: days });

  // Roll the 2×range series into current / prev totals and build the
  // current-range sparkline with zero-fill so the chart is consistent.
  const byDay = new Map<string, { pv: number; uv: number }>();
  for (const [day, pv, uv] of series as SeriesRow[]) {
    byDay.set(String(day), { pv: Number(pv) || 0, uv: Number(uv) || 0 });
  }
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const seriesPageviews: number[] = [];
  const seriesVisitors: number[] = [];
  const seriesDates: string[] = [];
  let pageviews = 0, visitors = 0, pageviewsPrev = 0, visitorsPrev = 0;
  for (let i = days * 2 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = iso(d);
    const row = byDay.get(key) ?? { pv: 0, uv: 0 };
    if (i < days) {
      seriesPageviews.push(row.pv);
      seriesVisitors.push(row.uv);
      seriesDates.push(key);
      pageviews += row.pv;
      visitors += row.uv;
    } else {
      pageviewsPrev += row.pv;
      visitorsPrev += row.uv;
    }
  }

  // Funnel: step key → visitor count, laid out in declared order so the
  // drop-off percentages read cleanly top-to-bottom.
  const funnelMap = new Map<string, number>();
  for (const [key, v] of (funnel ?? []) as FunnelRow[]) {
    funnelMap.set(String(key), Number(v) || 0);
  }
  let firstCount = 0;
  const bookingFunnel = FUNNEL_STEPS.map((f, i) => {
    const count = funnelMap.get(f.key) ?? 0;
    if (i === 0) firstCount = count;
    const prev = i === 0 ? count : (funnelMap.get(FUNNEL_STEPS[i - 1].key) ?? 0);
    const dropPct = i === 0 || prev === 0 ? null : ((prev - count) / prev) * 100;
    return { step: f.key, label: f.label, visitors: count, dropPct };
  });
  void firstCount;

  // Pull conversion-ish events out of the generic list so the topline
  // cards show them directly.
  const topEventsList = (events ?? []).map((r) => ({
    event: String(r[0]),
    count: Number(r[1]) || 0,
  }));
  const eventCount = (name: string) => topEventsList.find((e) => e.event === name)?.count ?? 0;
  const bookingsSubmitted = eventCount("booking_submitted");
  const depositPaid = eventCount("booking_deposit_paid");
  const contactsSubmitted = eventCount("contact_submitted");

  // Optional: rate of contact submissions that opted in to SMS. A
  // separate query so a simple "count where property=true" can reuse
  // the $pageview filter pattern (but doesn't need days doubling).
  const smsOptInQ = `
    SELECT
      countIf(event = 'contact_submitted' AND properties.sms_consent = 'true') as opted,
      countIf(event = 'contact_submitted') as total
    FROM events
    WHERE timestamp >= now() - INTERVAL ${days} DAY
  `;
  type OptRow = [number, number];
  const optRows = await queryPostHog<OptRow>(smsOptInQ);
  let smsOptInRate: number | null = null;
  if (optRows && optRows[0]) {
    const [opted, total] = optRows[0] as unknown as OptRow;
    smsOptInRate = Number(total) > 0 ? (Number(opted) / Number(total)) * 100 : null;
  }

  const report: AudienceReport = {
    configured: true,
    rangeDays: days,
    visitors,
    pageviews,
    visitorsPrev,
    pageviewsPrev,
    pageviewsPerVisitor: visitors > 0 ? pageviews / visitors : 0,
    seriesPageviews,
    seriesVisitors,
    seriesDates,
    topPages: (pages ?? []).map((r) => ({
      path: String(r[0] || "/"),
      pageviews: Number(r[1]) || 0,
      visitors: Number(r[2]) || 0,
      avgTimeS: Number(r[3]) || 0,
    })),
    topReferrers: (refs ?? []).map((r) => ({
      domain: String(r[0] || "—"),
      visits: Number(r[1]) || 0,
      visitors: Number(r[2]) || 0,
    })),
    topDevices: (devices ?? []).map((r) => ({
      device: String(r[0] || "unknown"),
      visits: Number(r[1]) || 0,
    })),
    topCountries: (countries ?? []).map((r) => ({
      country: String(r[0] || "—"),
      visits: Number(r[1]) || 0,
    })),
    topBrowsers: (browsers ?? []).map((r) => ({
      browser: String(r[0] || "—"),
      visits: Number(r[1]) || 0,
    })),
    bookingFunnel,
    topEvents: topEventsList,
    bookingsSubmitted,
    depositPaid,
    contactsSubmitted,
    smsOptInRate,
  };

  return apiSuccess(report);
}
