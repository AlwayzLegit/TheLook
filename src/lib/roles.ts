import { auth } from "./auth";
import { hasPermission, hasAnyAdminPermission, type Permission } from "./permissions";

// Legacy role enum, kept for backwards compatibility while permission-
// based gating rolls out:
//   • admin   — full access, including creating / editing / deleting users.
//   • manager — everything except user management.
//   • stylist — public profile + the stylist /my portal. No admin shell.
//
// Most gate decisions now run against SessionUser.permissions instead of
// SessionUser.role. The role string is still exposed so a couple of
// stylist-only paths (/api/admin/my-profile, waitlist self-view) can
// route on it until they're migrated to permission semantics.
export type UserRole = "admin" | "manager" | "stylist";

export interface SessionUser {
  role: UserRole;
  stylistId: string | null;
  email: string;
  name: string;
  permissions: ReadonlyArray<string>;
  title: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user;
  return {
    role: (u.role as UserRole) || "admin",
    stylistId: u.stylistId ?? null,
    email: u.email ?? "",
    name: u.name ?? "",
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    title: u.title ?? null,
  };
}

// Permission-aware predicate. Prefer this in new code and any time
// you're swapping out a role check. The permission catalogue lives
// in lib/permissions.ts.
export function userHasPermission(
  user: SessionUser | null,
  required: Permission,
): boolean {
  if (!user) return false;
  return hasPermission(user.permissions, required);
}

// "Can reach the admin shell at all" — at least one permission. Used
// by middleware so a user with zero permissions but a valid session
// (e.g. a stylist with just /my access) doesn't slip into /admin/*.
export function userCanAccessAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return hasAnyAdminPermission(user.permissions);
}

// ─── Legacy role helpers ────────────────────────────────────────────
// New code should use userHasPermission / userCanAccessAdmin. These
// remain so the stylist-portal paths and a couple of UI badges that
// still surface the role label keep working.
export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}
export function isAdminOrManager(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "manager";
}
export function isManager(user: SessionUser | null): boolean {
  return user?.role === "manager";
}
export function isStylist(user: SessionUser | null): boolean {
  return user?.role === "stylist";
}
