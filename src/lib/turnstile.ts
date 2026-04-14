interface TurnstileResult {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(token: string | undefined, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Captcha service is not configured." };
    }
    return { ok: true };
  }
  if (!token) return { ok: false, error: "Captcha verification is required." };

  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });
    const data = (await res.json()) as TurnstileResult;
    if (!data.success) {
      return { ok: false, error: "Captcha verification failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Captcha verification failed." };
  }
}

