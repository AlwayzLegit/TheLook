import { auth } from "./auth";

export type UserRole = "admin" | "stylist";

interface SessionUser {
  role: UserRole;
  stylistId: string | null;
  email: string;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session.user as any;
  return {
    role: u.role || "admin",
    stylistId: u.stylistId || null,
    email: u.email || "",
    name: u.name || "",
  };
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

export function isStylist(user: SessionUser | null): boolean {
  return user?.role === "stylist";
}
