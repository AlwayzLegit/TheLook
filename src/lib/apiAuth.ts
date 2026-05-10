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
