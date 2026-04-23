import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

// Project-specific augmentation so every `session.user.role`, .stylistId,
// etc. read is typed instead of needing `(u as any).role`. Imported
// transparently by every file that uses `auth()` via next-auth's
// module-augmentation hook — no runtime cost.
type Role = "admin" | "manager" | "stylist";

declare module "next-auth" {
  interface Session {
    user: {
      role: Role;
      stylistId: string | null;
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    role?: Role;
    stylistId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: Role;
    stylistId?: string | null;
  }
}
