import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { checkRateLimit } from "./rateLimit";

// In-memory login attempt tracker for lockout after repeated failures.
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

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
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const inputEmail = email.toLowerCase().trim();

        if (!inputEmail) return null;

        // Rate limit login attempts per email
        const rl = await checkRateLimit({
          key: `login:${inputEmail}`,
          limit: 10,
          windowMs: 15 * 60 * 1000,
        });
        if (!rl.ok) return null;

        // Check lockout
        const attempts = failedAttempts.get(inputEmail);
        if (attempts && attempts.lockedUntil > Date.now()) {
          return null;
        }

        const adminPassword = process.env.ADMIN_PASSWORD;
        const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const allowedEmails = new Set<string>(
          (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((e) => e.toLowerCase().trim())
            .filter(Boolean),
        );
        if (configuredAdminEmail) allowedEmails.add(configuredAdminEmail);

        if (
          inputEmail &&
          adminPassword &&
          password === adminPassword &&
          allowedEmails.has(inputEmail)
        ) {
          // Clear failed attempts on success
          failedAttempts.delete(inputEmail);
          return { id: "1", name: "Admin", email: inputEmail };
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
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});
