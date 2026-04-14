import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // NextAuth v5 expects AUTH_SECRET in many deployments; keep compatibility
  // with NEXTAUTH_SECRET used by older setups.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  // Vercel/edge deployments commonly require trusting forwarded host headers.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const inputEmail = email.toLowerCase().trim();
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
          return { id: "1", name: "Admin", email: inputEmail };
        }
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
