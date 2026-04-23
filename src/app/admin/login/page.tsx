"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginInner() {
  const search = useSearchParams();
  const reason = search?.get("reason");
  const idleBanner = reason === "idle"
    ? "You were signed out after 30 minutes of inactivity."
    : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-navy flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl text-white text-center mb-2">THE LOOK</h1>
        <p className="text-gold text-center text-sm tracking-[0.3em] uppercase font-body mb-10">Admin</p>

        {idleBanner && (
          <div className="mb-6 px-4 py-3 text-sm font-body text-amber-200 bg-amber-900/20 border border-amber-500/30">
            {idleBanner}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/60 text-sm font-body mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 font-body focus:outline-none focus:border-rose transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-body mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 font-body focus:outline-none focus:border-rose transition-colors"
            />
          </div>

          {error && <p className="text-rose text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm py-3 transition-colors font-body"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// useSearchParams requires a Suspense boundary under Next.js 15 when the
// page is statically rendered.
export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
