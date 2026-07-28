"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageContext";

const year = new Date().getFullYear();

const GUIDES_LABEL: Record<Locale, string> = {
  en: "Guides", es: "Guías", fr: "Guides", it: "Guide", pt: "Guias", de: "Ratgeber",
};

export default function Footer() {
  const { t } = useTranslation();
  const { locale } = useLanguage();

  return (
    <footer className="w-full bg-black text-white">

      {/* Ready to book CTA */}
      <div className="border-b border-white/10 py-14">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">{t("footer.readyToBook")}</h2>
          <p className="mt-2 text-base font-bold text-white/70">{t("footer.noAccountNeeded")}</p>
          <Link href="/book"
            className="mt-6 inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            {t("common.bookNow")}
          </Link>
          <p className="mt-4 text-sm font-bold text-white/70">
            {t("footer.alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-white underline hover:opacity-80">{t("footer.signIn")}</Link>
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Logo + tagline */}
          <div className="shrink-0">
            <Image src="/camel-logo.png" alt="Camel Global — Meet and Greet Car Hire Spain" width={200} height={70} className="h-14 w-auto mb-4 brightness-0 invert" />
            <p className="max-w-[200px] text-sm font-bold text-white/60 leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 md:gap-14">

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">{t("footer.company")}</p>
              <Link href="/about"                                         className="text-sm font-bold text-white hover:underline">{t("footer.aboutUs")}</Link>
              <Link href={`/${locale}/guides`}                            className="text-sm font-bold text-white hover:underline">{GUIDES_LABEL[locale] ?? "Guides"}</Link>
              <a    href="https://portal.camel-global.com/partner/signup" className="text-sm font-bold text-white hover:underline">{t("footer.becomePartner")}</a>
              <Link href="/contact"                                        className="text-sm font-bold text-white hover:underline">{t("footer.contact")}</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">{t("footer.legal")}</p>
              <Link href="/terms"   className="text-sm font-bold text-white hover:underline">{t("footer.customerTerms")}</Link>
              <Link href="/privacy" className="text-sm font-bold text-white hover:underline">{t("footer.privacyPolicy")}</Link>
              <Link href="/cookies" className="text-sm font-bold text-white hover:underline">{t("footer.cookiePolicy")}</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">{t("footer.account")}</p>
              <Link href="/login"    className="text-sm font-bold text-white hover:underline">{t("footer.signIn")}</Link>
              <Link href="/signup"   className="text-sm font-bold text-white hover:underline">{t("common.createAccount")}</Link>
              <Link href="/bookings" className="text-sm font-bold text-white hover:underline">{t("footer.myBookings")}</Link>
            </div>

          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-6">
          <p className="text-xs font-bold text-white leading-relaxed">
            {t("footer.copyright", { year: String(year) })}
          </p>
        </div>
      </div>
    </footer>
  );
}