import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://challenges.cloudflare.com https://va.vercel-scripts.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com https://www.google-analytics.com https://www.googletagmanager.com https://*.stripe.com",
      "frame-src https://js.stripe.com https://*.stripe.com https://challenges.cloudflare.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://api.frankfurter.app https://challenges.cloudflare.com https://va.vercel-scripts.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://region1.analytics.google.com https://region1.google-analytics.com https://api.anthropic.com https://api.stripe.com https://*.stripe.com",
      // Blocks form submissions and navigations to any domain not in this list
      // stripe.com included because Stripe redirects to checkout.stripe.com after payment intent
      "form-action 'self' https://checkout.stripe.com https://*.stripe.com",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // The guides routes read Markdown from content/guides/ with fs at request time.
  // Force those files into the serverless bundle so runtime reads work on Vercel.
  outputFileTracingIncludes: {
    "/[market]/guides": ["./content/guides/**/*"],
    "/[market]/guides/[slug]": ["./content/guides/**/*"],
    // The sitemap is a metadata route → its internal key carries a /route
    // suffix; the bare "/sitemap.xml" key never matched, so guide posts were
    // silently missing from the deployed sitemap. Key both to be safe.
    "/sitemap.xml": ["./content/guides/**/*"],
    "/sitemap.xml/route": ["./content/guides/**/*"],
  },
  // Guides moved from language folders to MARKET folders (/en/guides -> /gb/guides), so
  // every previously indexed URL is redirected rather than dropped. The two Australian
  // posts must come FIRST: they were under /en/ too, and the catch-all below would
  // otherwise send them to /gb/.
  async redirects() {
    return [
      {
        source: "/en/guides/meet-and-greet-car-hire-adelaide-airport-camel-global",
        destination: "/au/guides/meet-and-greet-car-hire-adelaide-airport-camel-global",
        permanent: true,
      },
      {
        source: "/en/guides/meet-and-greet-car-hire-sydney-skip-the-rental-desk-with-camel-global",
        destination: "/au/guides/meet-and-greet-car-hire-sydney-skip-the-rental-desk-with-camel-global",
        permanent: true,
      },
      { source: "/en/guides/:slug", destination: "/gb/guides/:slug", permanent: true },
      { source: "/en/guides", destination: "/gb/guides", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Explicit noindex for logged-in / transactional areas (belt-and-suspenders
      // alongside the robots.txt Disallow — keeps these out of search).
      {
        source: "/(account|bookings|checkout|reset-password)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;