import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getIp(req);
  const { allowed } = rateLimit(ip, "verify-captcha", { maxRequests: 20, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (!token) {
    return NextResponse.json({ error: "Missing captcha token." }, { status: 400 });
  }

  const valid = await verifyTurnstile(token, ip);
  if (!valid) {
    return NextResponse.json({ error: "Captcha verification failed. Please try again." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}