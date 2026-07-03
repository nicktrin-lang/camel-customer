"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { currencyLocale } from "@/lib/currency";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type IntentData = {
  client_secret:     string;
  payment_intent_id: string;
  amount_total:      number;
  amount_car_hire:   number;
  amount_fuel:       number;
  commission:        number;
  currency:          string;
  partner_name:      string;
};

const LOCALE_MAP: Record<string, string> = { EUR: "es-ES", GBP: "en-GB", USD: "en-US", AUD: "en-AU", NZD: "en-NZ", CAD: "en-CA" };
function fmtCurr(amount: number, currency: string) {
  const curr = currency.toUpperCase();
  return new Intl.NumberFormat(LOCALE_MAP[curr] || "en-GB", { style: "currency", currency: curr }).format(amount);
}

// Language boxes — same component shape/classes as LanguageBoxes in ClientRootLayout,
// so the buttons are visually identical to the rest of the site.
function CheckoutLangSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" },
    { code: "it", label: "IT" },
    { code: "pt", label: "PT" },
    { code: "de", label: "DE" },
  ];
  const pad = compact ? "px-2.5 py-1.5" : "px-4 py-2";
  const gap = compact ? "gap-1" : "gap-2";
  return (
    <div className={`flex items-center ${gap} flex-wrap`}>
      {options.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={[
            pad,
            "text-xs font-black border transition-colors",
            locale === code
              ? "bg-[#ff7a00] text-white border-[#ff7a00]"
              : "text-white/60 border-white/20 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Checkout's own nav. The global header in ClientRootLayout is suppressed on
// /checkout, so this nav reproduces the site-wide pattern: desktop inline
// switcher, mobile burger dropdown with a LANGUAGE row.
function CheckoutNav() {
  const { t } = useTranslation();
  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!burgerOpen) return;
    function handleClick(e: MouseEvent) {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) {
        setBurgerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [burgerOpen]);

  return (
    <nav className="relative w-full bg-black px-4 py-2.5 flex items-center justify-between">
      {/* Logo — non-link on checkout to avoid an abandonment path mid-payment */}
      <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert shrink-0" />

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3">
        <CheckoutLangSwitch compact />
        <Link href="/bookings" className="text-sm font-black text-white/60 hover:text-white">{t("common.myBookings")}</Link>
      </div>

      {/* Mobile burger */}
      <div className="flex md:hidden items-center gap-2" ref={burgerRef}>
        <button
          type="button"
          onClick={() => setBurgerOpen(o => !o)}
          aria-label={t("nav.burger.menu")}
          className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 border border-white/20 hover:bg-white/10 transition-colors"
        >
          <span className={`block h-0.5 w-5 bg-white transition-transform ${burgerOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-5 bg-white transition-opacity ${burgerOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-white transition-transform ${burgerOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>

        {/* Dropdown */}
        {burgerOpen && (
          <div className="absolute top-full left-0 right-0 bg-black border-t border-white/10 z-50 py-3 space-y-0">
            {/* Language toggle row */}
            <div className="px-4 py-3 border-b border-white/10">
              <span className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">{t("nav.language")}</span>
              <CheckoutLangSwitch />
            </div>
            <Link href="/bookings" className="block px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
              {t("common.myBookings")}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function CheckoutForm({ intent, requestId, onError }: {
  intent: IntentData;
  requestId: string;
  onError: (msg: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const { t }    = useTranslation();
  const [paying,  setPaying]  = useState(false);
  const [formErr, setFormErr] = useState("");
  const [ready,   setReady]   = useState(false);

  const curr = intent.currency.toUpperCase();
  const successUrl = requestId
    ? `/bookings/${requestId}?payment=success`
    : "/bookings";

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true); setFormErr(""); onError("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${successUrl}`,
        payment_method_data: {
          billing_details: { name: intent.partner_name },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message || "Payment failed. Please try again.";
      setFormErr(msg); onError(msg); setPaying(false);
      return;
    }

    router.push(successUrl);
  }

  return (
    <div className="space-y-6">
      {/* Order summary */}
      <div className="bg-[#f0f0f0] p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-black">{t("checkout.summary")}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-black/60">{t("checkout.hirePriceLabel")} — {intent.partner_name}</span>
            <span className="font-black text-black">{fmtCurr(intent.amount_car_hire, curr)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-black/60">{t("checkout.fuelDepositLabel")} <span className="text-black/40">{t("checkout.fuelDepositRefundable")}</span></span>
            <span className="font-black text-black">{fmtCurr(intent.amount_fuel, curr)}</span>
          </div>
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2">
            <span className="text-black">{t("checkout.total")}</span>
            <span className="text-black text-lg">{fmtCurr(intent.amount_total, curr)}</span>
          </div>
        </div>
        <div className="border border-black/10 bg-white px-3 py-2 text-xs font-bold text-black/50">
          {t("checkout.fuelRefundNote")}
        </div>
      </div>

      {/* Stripe payment form */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("checkout.paymentDetails")}</p>
        <PaymentElement
          options={{ layout: "tabs" }}
          onReady={() => setReady(true)}
        />
      </div>

      {!ready && (
        <div className="flex items-center gap-2 text-sm font-bold text-black/40">
          <div className="h-4 w-4 rounded-full border-2 border-[#ff7a00] border-t-transparent animate-spin" />
          {t("common.loading")}
        </div>
      )}

      {formErr && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {formErr}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || !elements || !ready || paying}
        className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {paying ? t("checkout.processing") : `${t("checkout.payNow")} ${fmtCurr(intent.amount_total, curr)}`}
      </button>

      <p className="text-xs font-bold text-black/40 text-center">
        {t("checkout.stripeNote")}
      </p>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ bid_id: string }> }) {
  const router   = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const { t }    = useTranslation();

  const [bidId,     setBidId]     = useState("");
  const [requestId, setRequestId] = useState("");
  const [intent,    setIntent]    = useState<IntentData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => { params.then(p => setBidId(p.bid_id)); }, [params]);

  useEffect(() => {
    if (!bidId) return;
    const storedRequestId = sessionStorage.getItem(`request_for_bid_${bidId}`) || "";
    if (storedRequestId) setRequestId(storedRequestId);

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace(`/login?next=/checkout/${bidId}`);
        return;
      }
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bid_id: bidId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "Failed to initialise payment.");
        setLoading(false);
        return;
      }
      setIntent(json);
      setLoading(false);
    }
    init();
  }, [bidId, supabase, router]);

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col">
      <CheckoutNav />
      <div className="flex-1 flex items-center justify-center bg-[#f0f0f0]">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-4 border-[#ff7a00] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-black text-black">{t("checkout.settingUp")}</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white flex flex-col">
      <CheckoutNav />
      <div className="flex-1 flex items-center justify-center bg-[#f0f0f0] px-6">
        <div className="max-w-md w-full bg-white p-8 space-y-4">
          <p className="text-lg font-black text-red-700">{t("checkout.unavailable")}</p>
          <p className="text-sm font-bold text-black/60">{error}</p>
          <button onClick={() => router.back()}
            className="w-full border border-black/20 py-3 text-sm font-black text-black hover:bg-black/5">
            ← {t("common.back")}
          </button>
        </div>
      </div>
    </div>
  );

  if (!intent) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CheckoutNav />

      <div className="w-full bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("checkout.secureCheckout")}</p>
          <h1 className="text-3xl font-black">{t("checkout.title")}</h1>
        </div>
      </div>

      <div className="flex-1 bg-[#f0f0f0] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white p-8">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: intent.client_secret,
                appearance: {
                  theme: "flat",
                  variables: {
                    colorPrimary:    "#ff7a00",
                    colorBackground: "#f0f0f0",
                    fontFamily:      "system-ui, sans-serif",
                    borderRadius:    "0px",
                  },
                },
              }}
            >
              <CheckoutForm intent={intent} requestId={requestId} onError={setError} />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}
