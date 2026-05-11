import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

// Project-specific augmentation so every `session.user.role`, .stylistId,
// .permissions, .title read is typed instead of needing `(u as any)...`.
// Imported transparently by every file that uses `auth()` via next-auth's
// module-augmentation hook — no runtime cost.
//
// `role` is still on the session for one release as a compat shim — most
// gate decisions now consume `permissions`. A later cleanup PR will drop
// it once no code path reads it.
type Role = "admin" | "manager" | "stylist";

declare module "next-auth" {
  interface Session {
    user: {
      role: Role;
      stylistId: string | null;
      permissions: string[];
      title: string | null;
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    role?: Role;
    stylistId?: string | null;
    permissions?: string[];
    title?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: Role;
    stylistId?: string | null;
    permissions?: string[];
    title?: string | null;
  }
}
