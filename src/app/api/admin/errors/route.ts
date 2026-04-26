import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Proxy to Sentry's REST API so the admin /admin/errors page can list
// recent issues without needing every operator to log into Sentry. We
// reuse the SENTRY_AUTH_TOKEN that's already wired for source-map
// upload — that token's "User Auth Token" form has org:read implicitly
// when it was created with an internal integration. If your token only
// has project:write (the upload-only scope), this endpoint returns the
// "missing-scope" error from Sentry and the admin sees a friendly
// reminder instead of a crash.
//
// GET /api/admin/errors?period=24h&query=is:unresolved
//   → { issues: [...], total: number }
// GET /api/admin/errors?count=true
//   → { count: number }   ← lightweight for the sidebar badge

const SENTRY_API = "https://sentry.io/api/0";

interface SentryIssue {
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
  metadata?: { type?: string; value?: string; filename?: string };
}

async function fetchIssues(opts: {
  org: string;
  project: string;
  token: string;
  period: string;
  query: string;
  limit: number;
}): Promise<{ ok: true; issues: SentryIssue[] } | { ok: false; error: string; status: number }> {
  const params = new URLSearchParams({
    statsPeriod: opts.period,
    query: opts.query,
    limit: String(opts.limit),
  });
  const url = `${SENTRY_API}/projects/${encodeURIComponent(opts.org)}/${encodeURIComponent(opts.project)}/issues/?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${opts.token}` },
      // Sentry sometimes takes 1-2s; don't let a slow Sentry hang our
      // admin dashboard polling cycle.
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text.slice(0, 400) || `Sentry returned ${res.status}` };
    }
    const data = (await res.json()) as SentryIssue[];
    return { ok: true, issues: Array.isArray(data) ? data : [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, status: 502, error: msg };
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);

  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!token || !org || !project) {
    // Soft-fail: admin sees the page with a config notice instead of
    // a 500. Same for the count endpoint below.
    return apiSuccess({
      issues: [],
      total: 0,
      configured: false,
      message:
        "Sentry isn't fully configured — set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN in Vercel.",
    });
  }

  const sp = request.nextUrl.searchParams;
  const countOnly = sp.get("count") === "true";
  const period = sp.get("period") || "24h";
  const query = sp.get("query") || "is:unresolved";
  const limit = countOnly ? 100 : Math.min(parseInt(sp.get("limit") || "25", 10) || 25, 100);

  const result = await fetchIssues({ org, project, token, period, query, limit });
  if (!result.ok) {
    logError("admin/errors GET", { status: result.status, error: result.error });
    if (result.status === 401 || result.status === 403) {
      return apiSuccess({
        issues: [],
        total: 0,
        configured: true,
        message:
          "Sentry rejected the auth token. The token used for source-map upload may not have org:read / project:read scope. Generate a new User Auth Token at sentry.io with `event:read` + `project:read` and update SENTRY_AUTH_TOKEN in Vercel.",
      });
    }
    return apiError(`Failed to load Sentry issues: ${result.error}`, 502);
  }

  if (countOnly) {
    return apiSuccess({ count: result.issues.length, configured: true });
  }

  // Trim payload — admin dashboard doesn't need every Sentry field,
  // and the trimmed shape stays stable across SDK upgrades.
  const issues = result.issues.map((i) => ({
    id: i.id,
    title: i.title,
    culprit: i.culprit,
    level: i.level,
    status: i.status,
    count: i.count,
    userCount: i.userCount,
    lastSeen: i.lastSeen,
    firstSeen: i.firstSeen,
    permalink: i.permalink,
    type: i.metadata?.type ?? null,
    value: i.metadata?.value ?? null,
    filename: i.metadata?.filename ?? null,
  }));

  return apiSuccess({ issues, total: issues.length, configured: true });
}
