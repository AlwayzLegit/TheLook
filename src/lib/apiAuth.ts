import { NextRequest } from "next/server";
import { getSessionUser, isAdmin, isAdminOrManager, type UserRole } from "./roles";
import { apiError } from "./apiResponse";
import { logAuthEvent } from "./auditLog";

// Centralised gate for admin-only API surfaces. Round-9 QA found
// several routes (e.g. POST /api/admin/stylists) only checked
// `auth()` and let managers through. This helper standardises the
// gate so every admin endpoint either passes through with a user
// object or returns a 403 — and every denial lands in admin_log
// with action="auth.rbac.denied" so the owner can audit the misuse.

interface SessionUser {
  role: UserRole;
  stylistId: string | null;
  email: string;
  name: string;
}

type GateResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response };

async function gate(
  request: NextRequest | undefined,
  predicate: (u: SessionUser) => boolean,
  label: "admin" | "admin_or_manager",
): Promise<GateResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: apiError("Unauthorized", 401) };
  }
  if (predicate(user)) {
    return { ok: true, user };
  }
  // Fire-and-forget audit. Capture path + method so the audit feed
  // shows a manager hit "POST /api/admin/stylists" instead of the
  // bare denial event.
  const path = request?.nextUrl?.pathname || null;
  const method = request?.method || null;
  logAuthEvent("auth.rbac.denied", user.email || null, {
    userId: null,
    reason: label === "admin" ? "admin_required" : "admin_or_manager_required",
    path,
    method,
    role: user.role,
  }).catch(() => {});
  return { ok: false, response: apiError("Admins only.", 403) };
}

export function requireAdmin(request?: NextRequest): Promise<GateResult> {
  return gate(request, (u) => isAdmin(u), "admin");
}

export function requireAdminOrManager(request?: NextRequest): Promise<GateResult> {
  return gate(request, (u) => isAdminOrManager(u), "admin_or_manager");
}
