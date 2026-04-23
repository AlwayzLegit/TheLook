import { auth } from "./auth";

// Three roles today. Only two are user-facing:
//   • admin   — full access, including creating / editing / deleting users.
//   • manager — everything except user management. Can edit site branding,
//               prices, schedules, services, gallery, etc. Can also have a
//               public-facing profile on /team.
//   • stylist — held for forward compat with the original schema. No login
//               flow exposes this role today.
export type UserRole = "admin" | "manager" | "stylist";

interface SessionUser {
  role: UserRole;
  stylistId: string | null;
  email: string;
  name: string;
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
  };
}

// Strict admin — required for user management + role changes.
export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

// Gate for admin-shell access in general. Managers land here; stylists don't.
export function isAdminOrManager(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "manager";
}

export function isManager(user: SessionUser | null): boolean {
  return user?.role === "manager";
}

export function isStylist(user: SessionUser | null): boolean {
  return user?.role === "stylist";
}
