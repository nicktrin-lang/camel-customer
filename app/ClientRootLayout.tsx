"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import CurrencySelector from "@/app/components/CurrencySelector";
import CookieBanner from "@/app/components/CookieBanner";
import Footer from "@/app/components/Footer";
import GoogleAnalyticsPageView from "@/app/components/GoogleAnalytics";
import ChatWidget from "@/app/components/ChatWidget";
import { LanguageProvider, useLanguage, type Locale } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Compact toggle — same pattern as portal/driver
function CompactLanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];
  return (
    <div className="flex items-center gap-0 border border-white/20 overflow-hidden">
      {options.map(({ code, label }, i) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={[
            "px-2 py-1.5 text-xs font-black transition-colors",
            i < options.length - 1 ? "border-r border-white/20" : "",
            locale === code
              ? "bg-[#ff7a00] text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const isHomepage = pathname === "/";
  const isNewCustomerArea =
    pathname?.startsWith("/bookings") ||
    pathname?.startsWith("/book") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/account" ||
    pathname === "/reset-password";
  const isCheckoutPage = pathname?.startsWith("/checkout");
  const isTestBookingArea = pathname?.startsWith("/test-booking");
  const isCustomerPublicPage =
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname === "/cookies" ||
    pathname === "/terms";

  const showCurrencyInHeader = false;
  const isComingSoonPage = pathname === "/coming-soon";
  const showGlobalHeader = !isHomepage && !isComingSoonPage;

  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;
    async function check() {
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      const supabase = createCustomerBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsCustomerLoggedIn(!!data?.user);
      setCustomerName(
        String(data?.user?.user_metadata?.full_name || "").trim() ||
        String(data?.user?.email || "").split("@")[0] || ""
      );
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
        if (mounted) {
          setIsCustomerLoggedIn(!!session?.user);
          setCustomerName(
            String(session?.user?.user_metadata?.full_name || "").trim() ||
            String(session?.user?.email || "").split("@")[0] || ""
          );
        }
      });
      unsub = () => subscription.unsubscribe();
    }
    check();
    return () => { mounted = false; unsub?.(); };
  }, []);

  useEffect(() => {
    if (isHomepage || isNewCustomerArea || isCustomerPublicPage) {
      document.body.classList.remove("bg-[#f0f0f0]");
      document.body.classList.add("bg-white");
    } else {
      document.body.classList.remove("bg-white");
      document.body.classList.add("bg-[#f0f0f0]");
    }
  }, [isHomepage, isNewCustomerArea, isCustomerPublicPage]);

  async function handleCustomerLogout() {
    try {
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      await Promise.race([createCustomerBrowserClient().auth.signOut(), new Promise(r => setTimeout(r, 3000))]);
    } catch {}
    window.location.replace("/login?reason=signed_out");
  }

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      const supabase = createCustomerBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed?.session?.access_token ?? null;
    } catch { return null; }
  }, []);

  const bookingsHref   = isTestBookingArea ? "/test-booking/requests" : "/bookings";
  const newBookingHref = isTestBookingArea ? "/test-booking/new"      : "/book";
  const settingsHref   = isTestBookingArea ? "/test-booking/settings" : "/account";
  const loginHref      = isTestBookingArea ? "/test-booking/login"    : "/login";
  const signupHref     = isTestBookingArea ? "/test-booking/signup"   : "/signup";

  return (
    <>
      <GoogleAnalyticsPageView />

      {showGlobalHeader && !isCheckoutPage && (
        <>
          <header className="fixed left-0 top-0 z-50 w-full bg-black">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
              <Link href="/" className="flex items-center">
                <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
              </Link>
              <nav className="flex items-center gap-3">
                {showCurrencyInHeader && (
                  <div className="hidden sm:block"><CurrencySelector /></div>
                )}
                <CompactLanguageToggle />
                {isCustomerLoggedIn ? (
                  <>
                    <Link href={newBookingHref} className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">{t("common.newBooking")}</Link>
                    <Link href={bookingsHref}   className="hidden text-sm font-bold text-white hover:underline md:block">{t("common.myBookings")}</Link>
                    <Link href={settingsHref}   className="hidden text-sm font-bold text-white hover:underline md:block">{t("common.account")}</Link>
                    {customerName && <span className="hidden text-sm font-bold text-white lg:block">{t("common.hi", { name: customerName })}</span>}
                    <button type="button" onClick={handleCustomerLogout} className="border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors">{t("common.logout")}</button>
                  </>
                ) : (
                  <>
                    <Link href={signupHref} className="hidden text-sm font-bold text-white hover:underline sm:block">{t("nav.signUp")}</Link>
                    <Link href={loginHref}  className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">{t("nav.logIn")}</Link>
                  </>
                )}
              </nav>
            </div>
          </header>
          <div className="h-[76px]" />
        </>
      )}

      <main className="flex-1">{children}</main>
      {!isComingSoonPage && <Footer />}
      {!isComingSoonPage && <CookieBanner />}

      {isCustomerLoggedIn && !isComingSoonPage && (
        <ChatWidget getToken={getToken} apiPath="/api/chat" />
      )}
    </>
  );
}

export default function ClientRootLayout({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  fontClass?: string;
}) {
  return (
    <LanguageProvider>
      <InnerLayout>{children}</InnerLayout>
    </LanguageProvider>
  );
}