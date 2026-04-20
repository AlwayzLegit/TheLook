import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { checkRateLimit } from "./rateLimit";

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function findUserInDb(email: string): Promise<{ id: string; name: string; email: string; role: string; stylistId: string | null; passwordHash: string } | null> {
  try {
    const { supabase, hasSupabaseConfig } = await import("./supabase");
    if (!hasSupabaseConfig) return null;

    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .eq("active", true)
      .single();

    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      stylistId: data.stylist_id,
      passwordHash: data.password_hash,
    };
  } catch {
    return null;
  }
}

// Returns true if at least one active admin_users row exists. Once that's
// true, the env-var ADMIN_PASSWORD fallback is permanently disabled — the
// shared password becomes a liability the moment per-user accounts exist.
// Setting AUTH_ALLOW_ENV_FALLBACK=force in the environment overrides this
// (escape hatch in case the salon ever locks themselves out).
async function dbUsersExist(): Promise<boolean> {
  try {
    const { supabase, hasSupabaseConfig } = await import("./supabase");
    if (!hasSupabaseConfig) return false;
    const { count, error } = await supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        const inputEmail = email.toLowerCase().trim();

        if (!inputEmail) return null;

        const rl = await checkRateLimit({
          key: `login:${inputEmail}`,
          limit: 10,
          windowMs: 15 * 60 * 1000,
        });
        if (!rl.ok) return null;

        const attempts = failedAttempts.get(inputEmail);
        if (attempts && attempts.lockedUntil > Date.now()) return null;

        // Try database users first
        const dbUser = await findUserInDb(inputEmail);
        if (dbUser) {
          const { compare } = await import("bcryptjs");
          const valid = await compare(password, dbUser.passwordHash);
          if (valid) {
            failedAttempts.delete(inputEmail);
            return {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              stylistId: dbUser.stylistId,
            };
          }
        }

        // Fallback to env var admin (for initial setup before any DB users
        // exist). Disabled automatically once a real admin_users row is
        // created — the shared password is too risky to leave on once
        // per-user accounts exist. Override with AUTH_ALLOW_ENV_FALLBACK=force.
        const fallbackForced = process.env.AUTH_ALLOW_ENV_FALLBACK === "force";
        if (fallbackForced || !(await dbUsersExist())) {
          const adminPassword = process.env.ADMIN_PASSWORD;
          const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
          const allowedEmails = new Set<string>(
            (process.env.ADMIN_EMAILS || "")
              .split(",")
              .map((e) => e.toLowerCase().trim())
              .filter(Boolean),
          );
          if (configuredAdminEmail) allowedEmails.add(configuredAdminEmail);

          if (inputEmail && adminPassword && password === adminPassword && allowedEmails.has(inputEmail)) {
            failedAttempts.delete(inputEmail);
            return { id: "env-admin", name: "Admin", email: inputEmail, role: "admin", stylistId: null };
          }
        }

        // Track failed attempt
        const current = failedAttempts.get(inputEmail) || { count: 0, lockedUntil: 0 };
        current.count += 1;
        if (current.count >= MAX_FAILED) {
          current.lockedUntil = Date.now() + LOCKOUT_MS;
          current.count = 0;
        }
        failedAttempts.set(inputEmail, current);

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role || "admin";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.stylistId = (user as any).stylistId || null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).stylistId = token.stylistId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    // B-11 — sliding 4-hour idle window. Auth.js refreshes the JWT on every
    // request, so an active admin keeps their session; an idle one is
    // signed out automatically.
    maxAge: 4 * 60 * 60,
    updateAge: 30 * 60,
  },
  jwt: {
    maxAge: 4 * 60 * 60,
  },
  cookies: {
    // Force Secure + HttpOnly + SameSite=Lax on the session cookie. Auth.js
    // already does this in production by default, but we set it explicitly
    // so a misconfigured env can't downgrade it. Lax is required so the
    // post-OAuth top-level redirect still carries the cookie.
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
