import { NextResponse } from "next/server";

// TEMP diagnostic — reports which Stripe key + Vercel env this deployment runs,
// without exposing the secret (prefix only). Remove after Stripe validation.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const k = process.env.STRIPE_SECRET_KEY || "";
  const mode = k.startsWith("sk_test_") ? "TEST"
    : k.startsWith("sk_live_") ? "LIVE"
    : "UNKNOWN/UNSET";
  return NextResponse.json({
    stripe_mode: mode,
    key_prefix:  k.slice(0, 8) || "(empty)",
    publishable_prefix: (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").slice(0, 8) || "(empty)",
    vercel_env:  process.env.VERCEL_ENV || "(unset)",
    host:        req.headers.get("host"),
    site_url:    process.env.NEXT_PUBLIC_SITE_URL || "(unset)",
  });
}
