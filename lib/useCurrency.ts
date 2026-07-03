"use client";
import { useState, useEffect, useCallback } from "react";
import type { Currency } from "@/lib/currency";
import { formatEUR, formatGBP, formatMoney, coerceCurrency, isCurrency } from "@/lib/currency";

const STORAGE_KEY = "camel_currency_pref";

type Rates = { GBP: number; USD: number; AUD: number; NZD: number; CAD: number };

const FALLBACK_RATES: Rates = { GBP: 0.85, USD: 1.08, AUD: 1.63, NZD: 1.78, CAD: 1.47 };

type UseCurrencyReturn = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number | null;       // EUR → GBP (backwards compat)
  rates: Rates | null;       // all rates from EUR
  rateIsLive: boolean;
  loading: boolean;
  fmt: (amountEur: number | null | undefined) => string;
  fmtEur: (amount: number | null | undefined) => string;
  fmtGbp: (amount: number | null | undefined) => string;
  convertFromEur: (amountEur: number) => number;
};

export function useCurrency(): UseCurrencyReturn {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [rates, setRates] = useState<Rates | null>(null);
  const [rateIsLive, setRateIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isCurrency(saved)) setCurrencyState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchRates() {
      setLoading(true);
      try {
        const res = await fetch("/api/currency/rate", { cache: "no-store" });
        const data = await res.json();
        if (mounted && data?.rates) {
          setRates({
            GBP: Number(data.rates.GBP) || FALLBACK_RATES.GBP,
            USD: Number(data.rates.USD) || FALLBACK_RATES.USD,
            AUD: Number(data.rates.AUD) || FALLBACK_RATES.AUD,
            NZD: Number(data.rates.NZD) || FALLBACK_RATES.NZD,
            CAD: Number(data.rates.CAD) || FALLBACK_RATES.CAD,
          });
          setRateIsLive(!!data?.live);
        }
      } catch {
        if (mounted) setRates(FALLBACK_RATES);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchRates();
    return () => { mounted = false; };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(coerceCurrency(c));
    try { localStorage.setItem(STORAGE_KEY, coerceCurrency(c)); } catch {}
  }, []);

  const getRate = useCallback((to: Currency): number => {
    if (to === "EUR") return 1;
    return rates?.[to] ?? FALLBACK_RATES[to];
  }, [rates]);

  const convertFromEur = useCallback((amountEur: number): number => {
    return Math.round(amountEur * getRate(currency) * 100) / 100;
  }, [currency, getRate]);

  const fmt = useCallback((amountEur: number | null | undefined): string => {
    if (amountEur == null || isNaN(amountEur)) return "—";
    if (currency === "EUR") return formatEUR(amountEur);
    const converted = Math.round(amountEur * getRate(currency) * 100) / 100;
    return formatMoney(converted, currency);
  }, [currency, getRate]);

  return {
    currency,
    setCurrency,
    rate: rates?.GBP ?? null,
    rates,
    rateIsLive,
    loading,
    fmt,
    fmtEur: formatEUR,
    fmtGbp: formatGBP,
    convertFromEur,
  };
}
