import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { checkRateLimit } from "./rateLimit";
import bcrypt from "bcryptjs";

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
          const valid = await bcrypt.compare(password, dbUser.passwordHash);
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

        // Fallback to env var admin (for initial setup before any DB users exist)
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
  },
});
