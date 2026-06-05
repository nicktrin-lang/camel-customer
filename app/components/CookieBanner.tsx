"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

const STORAGE_KEY = "cookie_consent";

export type CookieConsent = "accepted" | "rejected" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "accepted" || v === "rejected") return v;
  return null;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", { analytics_storage: "granted" });
    }
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 z-[9999] w-full border-t border-white/10 bg-black px-4 py-5"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
        <p className="flex-1 text-sm font-semibold text-white/70 leading-relaxed">
          {t("cookie.message")}{" "}
          <Link href="/cookies" className="font-black text-white underline underline-offset-2 hover:text-[#ff7a00] transition-colors">
            {t("cookie.policy")}
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={reject}
            className="border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-black text-white hover:bg-white/10 transition-colors"
          >
            {t("cookie.decline")}
          </button>
          <button
            onClick={accept}
            className="bg-[#ff7a00] px-5 py-2.5 text-xs font-black text-white hover:opacity-90 transition-opacity"
          >
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}