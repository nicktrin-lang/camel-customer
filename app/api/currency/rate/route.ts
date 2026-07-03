import { NextResponse } from "next/server";

type Rates = { GBP: number; USD: number; AUD: number; NZD: number; CAD: number };

const FALLBACK: Rates = { GBP: 0.85, USD: 1.08, AUD: 1.63, NZD: 1.78, CAD: 1.47 };

let cachedRates: Rates | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedRates && now < cacheExpiry) {
    return NextResponse.json({ rate: cachedRates.GBP, rates: cachedRates, live: true, source: "cache" });
  }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP,USD,AUD,NZD,CAD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Frankfurter unavailable");
    const data = await res.json();
    const GBP = Number(data?.rates?.GBP);
    const USD = Number(data?.rates?.USD);
    const AUD = Number(data?.rates?.AUD);
    const NZD = Number(data?.rates?.NZD);
    const CAD = Number(data?.rates?.CAD);
    if ([GBP, USD, AUD, NZD, CAD].some(v => !v || isNaN(v))) throw new Error("Invalid rate");
    cachedRates = { GBP, USD, AUD, NZD, CAD };
    cacheExpiry = now + CACHE_TTL;
    // `rate` (EUR→GBP) kept for backwards compat with older callers
    return NextResponse.json({ rate: GBP, rates: cachedRates, live: true, source: "frankfurter.app" });
  } catch (e) {
    return NextResponse.json({
      rate: cachedRates?.GBP ?? FALLBACK.GBP,
      rates: cachedRates ?? FALLBACK,
      live: false, source: "fallback",
    });
  }
}
