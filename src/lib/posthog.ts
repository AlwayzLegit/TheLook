// Server-side PostHog Query API helper. Uses HogQL (a SQL-like dialect)
// to pull aggregated metrics for the admin dashboard.
//
// Required env vars (private, server-side only — do NOT prefix with NEXT_PUBLIC):
//   POSTHOG_PERSONAL_API_KEY — generate in PostHog → Account → Personal API Keys
//                              with the "query:read" scope.
//   POSTHOG_PROJECT_ID       — numeric project id, visible in PostHog → Settings → Project.
//   POSTHOG_HOST             — optional, defaults to https://us.posthog.com.
//                              Use https://eu.posthog.com for EU cloud.

const HOST = process.env.POSTHOG_HOST || "https://us.posthog.com";
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID;

export const hasPostHogConfig = !!(KEY && PROJECT);

export async function queryPostHog<T = unknown[]>(hogql: string, timeoutMs = 8_000): Promise<T[] | null> {
  if (!hasPostHogConfig) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
      signal: controller.signal,
      // Don't cache at the fetch layer — the route that calls this adds
      // its own Response revalidation window.
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[posthog] query failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return Array.isArray(data?.results) ? (data.results as T[]) : [];
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") console.error("[posthog] query error", err);
    return null;
  } finally {
    clearTimeout(t);
  }
}
