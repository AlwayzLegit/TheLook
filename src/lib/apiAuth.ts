import { NextRequest } from "next/server";
import {
  getSessionUser,
  userHasPermission,
  userCanAccessAdmin,
  type SessionUser,
} from "./roles";
import type { Permission } from "./permissions";
import { apiError } from "./apiResponse";
import { logAuthEvent } from "./auditLog";

// Centralised gate for admin-only API surfaces. Every admin endpoint
// runs one of the helpers below; on failure they return a 403 AND
// fire an admin_log row tagged "auth.rbac.denied" so the owner can
// audit the misuse.
//
// Two flavours, depending on the call site:
//   • requirePermission(perm, req)    — Cowork at the top of a handler.
//                                       Loads the session, gates, returns
//                                       { ok, user } or { ok:false, response }.
//   • denyMissingPermission(user, perm, req) — when the route already has
//                                       a user object in hand (e.g. needs
//                                       to branch on role first) and we
//                                       just want the structured 403 with
//                                       audit logging.
//
// The helper-based pattern is the source of truth for 403 audit rows.
// Round-26 QA caught that several inline-checked routes (discounts,
// deposit-rules, products, …) bare-returned apiError without writing
// the auth.rbac.denied row, so the audit feed had a blind spot —
// denyMissingPermission closes that gap with a one-line replacement.

type GateResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response };

async function gate(
  request: NextRequest | undefined,
  predicate: (u: SessionUser) => boolean,
  label: string,
): Promise<GateResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: apiError("Unauthorized", 401) };
  }
  if (predicate(user)) {
    return { ok: true, user };
  }
  const path = request?.nextUrl?.pathname || null;
  const method = request?.method || null;
  logAuthEvent("auth.rbac.denied", user.email || null, {
    userId: null,
    reason: label,
    path,
    method,
    role: user.role,
    permissions: [...user.permissions],
  }).catch(() => {});
  return { ok: false, response: apiError("You don't have access to this action.", 403) };
}

// Primary gate. Pass the permission this route requires; users without
// it get a 403. The error message stays generic — we don't leak which
// permission is missing back to the caller.
export function requirePermission(
  required: Permission,
  request?: NextRequest,
): Promise<GateResult> {
  return gate(request, (u) => userHasPermission(u, required), `permission_required:${required}`);
}

// "Any admin permission" — used by routes that just need to know the
// caller is somewhere in the admin shell (e.g. /api/admin/me). Prefer
// requirePermission for anything that has a real business gate.
export function requireAnyAdminAccess(request?: NextRequest): Promise<GateResult> {
  return gate(request, (u) => userCanAccessAdmin(u), "admin_shell_required");
}

// Companion to the inline `userHasPermission` pattern. Call sites that
// already loaded a user and need to deny on a missing permission swap
// `return apiError(...)` for `return denyMissingPermission(user, perm, req)`
// — same 403 to the client, but with an `auth.rbac.denied` audit row
// captured for the operator's review.
export async function denyMissingPermission(
  user: SessionUser,
  required: Permission,
  request?: NextRequest,
): Promise<Response> {
  const path = request?.nextUrl?.pathname || null;
  const method = request?.method || null;
  logAuthEvent("auth.rbac.denied", user.email || null, {
    userId: null,
    reason: `permission_required:${required}`,
    path,
    method,
    role: user.role,
    permissions: [...user.permissions],
  }).catch(() => {});
  return apiError("You don't have access to this action.", 403);
}

// ─── Legacy aliases ────────────────────────────────────────────────
// Kept so the few call sites that still need an explicit "admin only"
// or "admin / manager" gate (during the transition) don't have to be
// rewritten in this PR. requireAdmin → manage_users, since user
// management is the only capability the old admin role uniquely
// granted.
export function requireAdmin(request?: NextRequest): Promise<GateResult> {
  return requirePermission("manage_users", request);
}
export function requireAdminOrManager(request?: NextRequest): Promise<GateResult> {
  return requireAnyAdminAccess(request);
}
