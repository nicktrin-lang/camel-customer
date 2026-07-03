/**
 * Server-side currency conversion for Camel Global.
 * Used in API routes — cannot call /api/currency/rate on itself.
 * Fetches directly from frankfurter.app with in-memory cache.
 */

export type Currency = "EUR" | "GBP" | "USD" | "AUD" | "NZD" | "CAD";

// Non-EUR currencies we fetch rates for (EUR is the anchor / base = 1)
type NonEur = Exclude<Currency, "EUR">;
type RateMap = Record<NonEur, number>;

// ── Server-side rate cache ────────────────────────────────────────────────────
let cachedRates: RateMap | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const FALLBACK: RateMap = { GBP: 0.85, USD: 1.08, AUD: 1.63, NZD: 1.78, CAD: 1.47 };

async function getEurRates(): Promise<RateMap> {
  const now = Date.now();
  if (cachedRates && now < cacheExpiry) return cachedRates;

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
    if ([GBP, USD, AUD, NZD, CAD].some(v => !v || isNaN(v))) throw new Error("Invalid rates");
    cachedRates = { GBP, USD, AUD, NZD, CAD };
    cacheExpiry = now + CACHE_TTL;
    return cachedRates;
  } catch (e) {
    console.warn("serverCurrency: rate fetch failed, using fallback", e);
    return cachedRates ?? FALLBACK;
  }
}

/**
 * Returns the exchange rate from one currency to another.
 * All rates are anchored to EUR via frankfurter.app.
 */
export async function getRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  const rates = await getEurRates();

  // EUR → X
  if (from === "EUR" && to !== "EUR") return rates[to as NonEur];

  // X → EUR
  if (to === "EUR" && from !== "EUR") return 1 / rates[from as NonEur];

  // X → Y (via EUR) e.g. GBP → USD
  return (1 / rates[from as NonEur]) * rates[to as NonEur];
}

/**
 * Converts an amount from one currency to another.
 * Returns rounded to 2 decimal places.
 */
export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): Promise<{ convertedAmount: number; rate: number }> {
  const rate = await getRate(from, to);
  const convertedAmount = Math.round(amount * rate * 100) / 100;
  return { convertedAmount, rate };
}
