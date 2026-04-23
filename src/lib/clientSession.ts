import { createHmac, timingSafeEqual } from "crypto";

// Separate secret from NextAuth so rotating the admin auth secret does
// not invalidate every client portal session and vice versa. Falls back
// to AUTH_SECRET if the dedicated one is not configured (redeploy
// existing installs continue to work), and finally a hardcoded string
// in dev so `npm run dev` doesn't blow up before env.local is wired.
const SECRET =
  process.env.CLIENT_SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "thelook-client-dev-secret";

// Signed payload format: `<payload>.<signature>` where signature is
// base64url(HMAC-SHA256(payload, SECRET)). We hand-roll rather than
// reach for jose/jsonwebtoken because the payload is a single email
// string and pulling a JWT lib for one cookie is overkill.
function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string): string {
  const mac = createHmac("sha256", SECRET).update(payload).digest();
  return b64url(mac);
}

export function signClientSession(email: string): string {
  const payload = b64url(Buffer.from(email, "utf8"));
  return `${payload}.${sign(payload)}`;
}

export function verifyClientSession(token: string | undefined): string | null {
  if (!token || typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0 || idx === token.length - 1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  // timingSafeEqual requires identical lengths to even attempt — guard
  // so a length mismatch doesn't throw.
  if (sig.length !== expected.length) return null;
  const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return null;
  try {
    const raw = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return raw.toLowerCase().trim() || null;
  } catch {
    return null;
  }
}
