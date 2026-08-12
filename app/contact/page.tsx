"use client";

import { useRef, useState } from "react";
import Turnstile from "@/app/components/Turnstile";
import { useTranslation } from "@/lib/i18n/useTranslation";

const SUBJECTS_EN = [
  "General enquiry",
  "Booking question",
  "Partnership / become a partner",
  "Press or media",
  "Technical issue",
  "Other",
];

const SUBJECTS_ES = [
  "Consulta general",
  "Pregunta sobre reserva",
  "Asociación / hazte socio",
  "Prensa o medios",
  "Problema técnico",
  "Otro",
];

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

export default function ContactPage() {
  const { t, locale } = useTranslation();
  const subjects = locale === "es" ? SUBJECTS_ES : SUBJECTS_EN;

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [subject,      setSubject]      = useState("");
  const [message,      setMessage]      = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey,   setCaptchaKey]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setError(t("contact.error.allFields")); return;
    }
    if (!captchaToken) {
      setError(t("contact.error.captcha")); return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, captchaToken, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.error"));
        setCaptchaKey(k => k + 1); setCaptchaToken(null); return;
      }
      setSuccess(true);
    } catch {
      setError(t("common.error"));
      setCaptchaKey(k => k + 1); setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">

      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("contact.tagline")}</p>
          <h1 className="mb-4 text-4xl font-black text-white md:text-6xl">{t("contact.title")}</h1>
          <p className="text-lg font-semibold text-white max-w-xl leading-relaxed">{t("contact.subtitle")}</p>
        </div>
      </section>

      <section className="w-full bg-[#f0f0f0] px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">

          <div className="lg:col-span-1">
            <div className="bg-black p-6">
              <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-3">{t("contact.partner.title")}</p>
              <p className="text-base font-semibold text-white mb-4 leading-relaxed">{t("contact.partner.body")}</p>
              <a href="/partner/signup"
                className="inline-block bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity">
                {t("contact.partner.cta")}
              </a>
            </div>
          </div>

          <div className="lg:col-span-2" ref={formRef}>
            {success ? (
              <div className="bg-white p-10 text-center">
                <div className="mb-4 text-5xl">✅</div>
                <h2 className="mb-2 text-2xl font-black text-black">{t("contact.sent.title")}</h2>
                <p className="text-base font-semibold text-black/70 leading-relaxed mb-6">
                  {t("contact.sent")} <strong>{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setName(""); setEmail(""); setSubject(""); setMessage("");
                    setCaptchaToken(null); setCaptchaKey(k => k + 1);
                  }}
                  className="bg-[#f0f0f0] px-6 py-3 text-sm font-black text-black hover:bg-[#e8e8e8] transition-colors"
                >
                  {t("contact.sendAnother")}
                </button>
              </div>
            ) : (
              <div className="bg-white p-8 space-y-5">

                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t("contact.name")} <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith" maxLength={100} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("contact.email")} <span className="text-red-500">*</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="jane@example.com" maxLength={200} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t("contact.subject")} <span className="text-red-500">*</span></label>
                  <select value={subject} onChange={e => setSubject(e.target.value)}
                    className={inputCls + " appearance-none cursor-pointer"}>
                    <option value="">{t("contact.subject.placeholder")}</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>{t("contact.message")} <span className="text-red-500">*</span></label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    rows={7} maxLength={5000}
                    placeholder={t("contact.message.placeholder")}
                    className={inputCls + " resize-none"} />
                  <p className="mt-1 text-right text-xs font-semibold text-black/30">{message.length}/5000</p>
                </div>

                <Turnstile key={captchaKey}
                  onVerify={token => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)} />

                <button type="button" onClick={handleSubmit} disabled={loading}
                  className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {loading ? t("common.loading") : t("contact.submit")}
                </button>

                <p className="text-center text-xs font-semibold text-black/30">
                  {t("contact.turnstile")}{" "}
                  <a href="/privacy" className="underline hover:text-black/60">{t("privacy.title")}</a>.
                </p>
              </div>
            )}
          </div>

        </div>
      </section>

    </div>
  );
}