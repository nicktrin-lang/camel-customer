/**
 * Currency utilities for Camel Global
 *
 * - A partner's currency is their Stripe settlement currency (country-derived,
 *   set at Stripe onboarding, read-only thereafter).
 * - Every bid/booking snapshots its currency at creation. Customer always pays
 *   in the bid currency — NO conversion on the transactional path.
 * - Live exchange rates from frankfurter.app are used ONLY for secondary
 *   "≈ other currency" browse displays, never for charging.
 */
export type Currency = "EUR" | "GBP" | "USD" | "AUD" | "NZD" | "CAD";

/** Single source of truth for the supported currency list. */
export const CURRENCIES: Currency[] = ["EUR", "GBP", "USD", "AUD", "NZD", "CAD"];

const CURRENCY_LOCALE: Record<Currency, string> = {
  EUR: "es-ES",
  GBP: "en-GB",
  USD: "en-US",
  AUD: "en-AU",
  NZD: "en-NZ",
  CAD: "en-CA",
};

const CURRENCY_SYMBOL: Record<Currency, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  AUD: "A$",
  NZD: "NZ$",
  CAD: "C$",
};

/** Intl locale for a currency (accepts any string; falls back to es-ES). */
export function currencyLocale(c: string | null | undefined): string {
  const key = String(c || "EUR").toUpperCase() as Currency;
  return CURRENCY_LOCALE[key] ?? "es-ES";
}

/** Display symbol for a currency. */
export function currencySymbol(c: string | null | undefined): string {
  const key = String(c || "EUR").toUpperCase() as Currency;
  return CURRENCY_SYMBOL[key] ?? "€";
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && (CURRENCIES as string[]).includes(v);
}

/** Coerce any input to a supported Currency (uppercased), defaulting to EUR. */
export function coerceCurrency(v: unknown): Currency {
  const s = String(v || "").toUpperCase().trim();
  return (CURRENCIES as string[]).includes(s) ? (s as Currency) : "EUR";
}

// ── Rate cache (legacy single EUR→GBP path, kept for backwards compat) ─────────
let cachedRate: number | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getEurToGbpRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && now < cacheExpiry) return cachedRate;
  try {
    const res = await fetch("/api/currency/rate", { cache: "no-store" });
    if (!res.ok) throw new Error("Rate API unavailable");
    const data = await res.json();
    const rate = Number(data?.rate);
    if (!rate || isNaN(rate)) throw new Error("Invalid rate");
    cachedRate = rate;
    cacheExpiry = now + CACHE_TTL;
    return rate;
  } catch (e) {
    console.warn("Currency rate fetch failed, using fallback:", e);
    return cachedRate ?? 0.85;
  }
}

export async function getEurToGbpRateWithSource(): Promise<{ rate: number; live: boolean; source: string }> {
  const now = Date.now();
  if (cachedRate && now < cacheExpiry) return { rate: cachedRate, live: true, source: "cache" };
  try {
    const res = await fetch("/api/currency/rate", { cache: "no-store" });
    if (!res.ok) throw new Error("Rate API unavailable");
    const data = await res.json();
    const rate = Number(data?.rate);
    if (!rate || isNaN(rate)) throw new Error("Invalid rate");
    cachedRate = rate;
    cacheExpiry = now + CACHE_TTL;
    return { rate, live: data.live ?? true, source: data.source ?? "frankfurter.app" };
  } catch (e) {
    console.warn("Currency rate fetch failed, using fallback:", e);
    return { rate: cachedRate ?? 0.85, live: false, source: "fallback" };
  }
}

export async function eurToGbp(amountEur: number): Promise<number> {
  const rate = await getEurToGbpRate();
  return Math.round(amountEur * rate * 100) / 100;
}

export async function gbpToEur(amountGbp: number): Promise<number> {
  const rate = await getEurToGbpRate();
  return Math.round((amountGbp / rate) * 100) / 100;
}

// ── Formatting ────────────────────────────────────────────────────────────────

/** Format an amount already denominated in `currency`. Handles all supported currencies. */
export function formatMoney(amount: number | null | undefined, currency: Currency): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat(currencyLocale(currency), {
    style: "currency", currency, minimumFractionDigits: 2,
  }).format(amount);
}

export function formatEUR(amount: number | null | undefined): string { return formatMoney(amount, "EUR"); }
export function formatGBP(amount: number | null | undefined): string { return formatMoney(amount, "GBP"); }
export function formatUSD(amount: number | null | undefined): string { return formatMoney(amount, "USD"); }
export function formatAUD(amount: number | null | undefined): string { return formatMoney(amount, "AUD"); }
export function formatNZD(amount: number | null | undefined): string { return formatMoney(amount, "NZD"); }
export function formatCAD(amount: number | null | undefined): string { return formatMoney(amount, "CAD"); }

export function formatCurrency(amount: number | null | undefined, currency: Currency): string {
  return formatMoney(amount, currency);
}

// NOTE: convertFromEur / formatInCurrency below are legacy EUR↔GBP-only helpers.
// New code should use useCurrency() (rate map) or formatMoney(). Left as-is to
// avoid changing existing callers; they only ever convert to GBP.
export async function convertFromEur(amountEur: number, targetCurrency: Currency): Promise<number> {
  if (targetCurrency === "EUR") return amountEur;
  return eurToGbp(amountEur);
}

export async function formatInCurrency(
  amountEur: number | null | undefined,
  targetCurrency: Currency
): Promise<string> {
  if (amountEur == null || isNaN(amountEur)) return "—";
  if (targetCurrency === "EUR") return formatEUR(amountEur);
  const gbp = await eurToGbp(amountEur);
  return formatGBP(gbp);
}

// ── Dual currency display (EUR↔GBP specific, unchanged) ───────────────────────

/**
 * Given an EUR amount and a live rate, returns both formatted strings.
 *
 * partnerView:  "80,00 € (£68.00)"   — EUR primary, GBP secondary
 * customerView: "£68.00 (80,00 €)"   — GBP primary, EUR secondary
 */
export function formatDual(
  amountEur: number | null | undefined,
  rate: number,
  view: "partner" | "customer"
): string {
  if (amountEur == null || isNaN(amountEur)) return "—";
  const gbpAmt = Math.round(amountEur * rate * 100) / 100;
  const eur = formatEUR(amountEur);
  const gbp = formatGBP(gbpAmt);
  return view === "partner"
    ? `${eur} (${gbp})`
    : `${gbp} (${eur})`;
}

/**
 * Convenience: format a GBP amount (stored as GBP) with EUR secondary.
 * Used on pages where `amount` is stored in GBP (e.g. partner_bookings.amount).
 * Pass the live EUR→GBP rate.
 */
export function formatDualFromGbp(
  amountGbp: number | null | undefined,
  rate: number,
  view: "partner" | "customer"
): string {
  if (amountGbp == null || isNaN(amountGbp)) return "—";
  const eurAmt = Math.round((amountGbp / rate) * 100) / 100;
  const gbp = formatGBP(amountGbp);
  const eur = formatEUR(eurAmt);
  return view === "partner"
    ? `${eur} (${gbp})`
    : `${gbp} (${eur})`;
}
