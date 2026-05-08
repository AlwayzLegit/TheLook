import { NextRequest } from "next/server";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { renderMarkdown } from "@/lib/blog/markdown";

// Live-preview helper for the editor. Same sanitisation + remark/rehype
// pipeline the public post page uses, so what the operator sees is
// exactly what the visitor will see. Admin-gated so the renderer can't
// be poked anonymously.
export async function POST(request: NextRequest) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON.", 400); }
  const md = (body as { md?: unknown })?.md;
  if (typeof md !== "string") return apiError("Missing 'md' field.", 400);
  if (md.length > 200_000) return apiError("Body too large.", 413);
  const html = await renderMarkdown(md);
  return apiSuccess({ html });
}
