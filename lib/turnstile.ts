/**
 * Server-side Cloudflare Turnstile token verification.
 * Call this in any API route before processing the request.
 *
 * Replaces the old hCaptcha helper. Same contract: returns true only for a
 * token Cloudflare confirms, false for everything else (missing token, missing
 * secret, network error, rejected token) so callers fail closed.
 */
export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    return false;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    // Optional but recommended by Cloudflare: binds the token to the client IP.
    if (ip) body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (data.success !== true) {
      // Cloudflare returns machine-readable reasons; log them so a misconfigured
      // secret or a domain mismatch is diagnosable instead of a silent "failed".
      console.warn("Turnstile rejected token:", data["error-codes"]);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Turnstile verification failed:", e);
    return false;
  }
}
