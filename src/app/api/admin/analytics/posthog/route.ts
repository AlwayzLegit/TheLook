import { getSessionUser } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { hasPostHogConfig, queryPostHog } from "@/lib/posthog";

// Cache the expensive 4-query roll-up for 5 minutes at the edge so we
// don't burn through PostHog's query quota every time the dashboard
// polls on its 30-second cycle.
export const revalidate = 300;

type PageviewRow = [string, number, number]; // [day, pageviews, visitors]
type PathRow = [string, number, number];     // [pathname, pageviews, visitors]
type DomainRow = [string, number];           // [referring_domain, visits]
type DeviceRow = [string, number];           // [device_type, visits]

interface Summary {
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

const EMPTY: Summary = {
  visitorsWeek: 0,
  visitorsWeekPrev: 0,
  pageviewsWeek: 0,
  pageviewsWeekPrev: 0,
  pageviewsToday: 0,
  pageviewsYesterday: 0,
  sparkPageviews: [],
  sparkVisitors: [],
  topPages: [],
  topReferrers: [],
  topDevices: [],
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);

  // Dashboard calls this unconditionally; return an empty payload with
  // the configured:false flag so the UI can render a nudge panel instead
  // of a blank section.
  if (!hasPostHogConfig) {
    return apiSuccess({ configured: false, ...EMPTY });
  }

  // 14-day pageview / visitor timeseries — powers both the spark trends
  // and the week-vs-prev-week StatCards. Single query, two buckets.
  const seriesQ = `
    SELECT toDate(timestamp) AS day,
           count() AS pageviews,
           uniq(distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 14 DAY
    GROUP BY day
    ORDER BY day ASC
  `;

  const topPagesQ = `
    SELECT properties.$pathname AS pathname,
           count() AS pageviews,
           uniq(distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY
    GROUP BY pathname
    ORDER BY pageviews DESC
    LIMIT 8
  `;

  const topReferrersQ = `
    SELECT properties.$referring_domain AS domain, count() AS visits
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY
      AND properties.$referring_domain IS NOT NULL
      AND properties.$referring_domain != ''
      AND properties.$referring_domain != '$direct'
    GROUP BY domain
    ORDER BY visits DESC
    LIMIT 6
  `;

  const topDevicesQ = `
    SELECT coalesce(properties.$device_type, 'unknown') AS device, count() AS visits
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY
    GROUP BY device
    ORDER BY visits DESC
    LIMIT 5
  `;

  const [series, pages, refs, devices] = await Promise.all([
    queryPostHog<PageviewRow>(seriesQ),
    queryPostHog<PathRow>(topPagesQ),
    queryPostHog<DomainRow>(topReferrersQ),
    queryPostHog<DeviceRow>(topDevicesQ),
  ]);

  if (!series) return apiSuccess({ configured: true, ...EMPTY });

  // Reduce the 14-day series into week + prev-week sums and a 14-value
  // sparkline (pad with zeros on missing days so the chart keeps a
  // consistent length).
  const byDay = new Map<string, { pageviews: number; visitors: number }>();
  for (const [day, pv, uv] of series as PageviewRow[]) {
    byDay.set(day, { pageviews: Number(pv) || 0, visitors: Number(uv) || 0 });
  }
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const sparkPageviews: number[] = [];
  const sparkVisitors: number[] = [];
  let pageviewsWeek = 0, pageviewsWeekPrev = 0;
  let visitorsWeek = 0, visitorsWeekPrev = 0;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const row = byDay.get(iso(d)) ?? { pageviews: 0, visitors: 0 };
    sparkPageviews.push(row.pageviews);
    sparkVisitors.push(row.visitors);
    if (i < 7) {
      pageviewsWeek += row.pageviews;
      visitorsWeek += row.visitors;
    } else {
      pageviewsWeekPrev += row.pageviews;
      visitorsWeekPrev += row.visitors;
    }
  }
  const pageviewsToday = sparkPageviews[sparkPageviews.length - 1] || 0;
  const pageviewsYesterday = sparkPageviews[sparkPageviews.length - 2] || 0;

  const summary: Summary = {
    visitorsWeek,
    visitorsWeekPrev,
    pageviewsWeek,
    pageviewsWeekPrev,
    pageviewsToday,
    pageviewsYesterday,
    sparkPageviews,
    sparkVisitors,
    topPages: (pages ?? []).map((r) => ({
      path: String(r[0] || "/"),
      pageviews: Number(r[1]) || 0,
      visitors: Number(r[2]) || 0,
    })),
    topReferrers: (refs ?? []).map((r) => ({
      domain: String(r[0] || "—"),
      visits: Number(r[1]) || 0,
    })),
    topDevices: (devices ?? []).map((r) => ({
      device: String(r[0] || "unknown"),
      visits: Number(r[1]) || 0,
    })),
  };

  return apiSuccess({ configured: true, ...summary });
}
