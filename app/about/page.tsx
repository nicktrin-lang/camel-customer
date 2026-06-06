"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

const STEPS = [
  { n: "01", titleKey: "about.step1.title", bodyKey: "about.step1.body" },
  { n: "02", titleKey: "about.step2.title", bodyKey: "about.step2.body" },
  { n: "03", titleKey: "about.step3.title", bodyKey: "about.step3.body" },
  { n: "04", titleKey: "about.step4.title", bodyKey: "about.step4.body" },
  { n: "05", titleKey: "about.step5.title", bodyKey: "about.step5.body" },
  { n: "06", titleKey: "about.step6.title", bodyKey: "about.step6.body" },
];

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full">

      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("about.tagline")}</p>
          <h1 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">{t("about.hero.title")}</h1>
          <p className="max-w-2xl text-xl font-semibold leading-relaxed text-white">{t("about.hero.body")}</p>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-black text-black">{t("about.whatWeDo.title")}</h2>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">{t("about.whatWeDo.p1")}</p>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">{t("about.whatWeDo.p2")}</p>
          <p className="text-base font-semibold text-black leading-relaxed">{t("about.whatWeDo.p3")}</p>
        </div>
      </section>

      <section className="w-full bg-[#f0f0f0] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-3xl font-black text-black">{t("about.howItWorks.title")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {STEPS.map(({ n, titleKey, bodyKey }) => (
              <div key={n} className="bg-white p-6">
                <p className="mb-2 text-3xl font-black text-black/20">{n}</p>
                <h3 className="mb-2 text-lg font-black text-black">{t(titleKey)}</h3>
                <p className="text-base font-semibold leading-relaxed text-black/70">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-black text-black">{t("about.whyCamel.title")}</h2>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">{t("about.whyCamel.p1")}</p>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">{t("about.whyCamel.p2")}</p>
          <p className="text-base font-semibold text-black leading-relaxed">{t("about.whyCamel.p3")}</p>
        </div>
      </section>

      <section className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-3xl font-black text-white">{t("about.partner.title")}</h2>
          <p className="mb-8 max-w-2xl text-base font-semibold text-white leading-relaxed">{t("about.partner.body")}</p>
          <a href="/partner/signup"
            className="inline-block bg-[#ff7a00] px-8 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            {t("about.partner.cta")}
          </a>
        </div>
      </section>

      <section className="w-full bg-[#f0f0f0] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-3xl font-black text-black">{t("about.contact.title")}</h2>
          <p className="mb-6 text-base font-semibold text-black leading-relaxed">{t("about.contact.body")}</p>
          <a href="/contact"
            className="inline-block bg-[#ff7a00] px-8 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            {t("about.contact.cta")}
          </a>
        </div>
      </section>

    </div>
  );
}