"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import HCaptcha from "@/app/components/HCaptcha";
import { useTranslation } from "@/lib/i18n/useTranslation";

async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/verify-captcha", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

function LoginForm() {
  const supabase     = useMemo(() => createCustomerBrowserClient(), []);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get("next") || "/bookings";
  const { t }        = useTranslation();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [mode,         setMode]         = useState<"login" | "forgot">("login");
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState("");
  const [loginToken,   setLoginToken]   = useState("");
  const [forgotToken,  setForgotToken]  = useState("");
  const [loginKey,     setLoginKey]     = useState(0);
  const [forgotKey,    setForgotKey]    = useState(0);

  const handleLoginToken  = useCallback((t: string) => setLoginToken(t), []);
  const handleForgotToken = useCallback((t: string) => setForgotToken(t), []);
  function resetLoginCaptcha()  { setLoginToken("");  setLoginKey(k => k + 1); }
  function resetForgotCaptcha() { setForgotToken(""); setForgotKey(k => k + 1); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!loginToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const ok = await verifyCaptcha(loginToken);
      if (!ok) { setError("CAPTCHA verification failed."); resetLoginCaptcha(); setLoading(false); return; }
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (err) throw err;
      router.push(nextPath);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to sign in.");
      resetLoginCaptcha();
    } finally { setLoading(false); }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      if (!forgotToken) { setResetError("Please complete the CAPTCHA."); setResetLoading(false); return; }
      const ok = await verifyCaptcha(forgotToken);
      if (!ok) { setResetError("CAPTCHA verification failed."); resetForgotCaptcha(); setResetLoading(false); return; }
      document.cookie = "resetPortal=customer; domain=.camel-global.com; path=/; max-age=3600";
      const res  = await fetch("/api/auth/send-customer-reset-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/?portal=customer` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reset email.");
      setResetSent(true);
    } catch (e: any) {
      setResetError(e?.message || "Failed to send reset email.");
      resetForgotCaptcha();
    } finally { setResetLoading(false); }
  }

  const signupHref = nextPath !== "/bookings"
    ? `/signup?next=${encodeURIComponent(nextPath)}`
    : "/signup";

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            {mode === "login" ? t("common.account") : t("reset.title")}
          </p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            {mode === "login" ? t("login.welcomeBack") : t("reset.title")}
          </h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            {mode === "login" ? t("login.title") + "." : t("login.resetSubtitle")}
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-12">
        <div className="mx-auto max-w-md">
          <div className="bg-white p-8 space-y-5">

            {mode === "login" ? (
              <>
                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className={labelCls}>{t("login.email")}</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t("login.emailPlaceholder")} className={inputCls} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls} style={{marginBottom:0}}>{t("login.password")}</label>
                      <button type="button"
                        onClick={() => { setMode("forgot"); setError(null); }}
                        className="text-xs font-bold text-[#ff7a00] hover:underline">
                        {t("login.forgotPassword")}
                      </button>
                    </div>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" className={inputCls} />
                  </div>
                  <HCaptcha key={loginKey} onVerify={handleLoginToken} onExpire={() => setLoginToken("")} />
                  <button type="submit" disabled={loading}
                    className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {loading ? t("common.loading") : t("login.submit") + " →"}
                  </button>
                </form>
                <p className="text-center text-sm font-semibold text-black">
                  {t("login.noAccount")}{" "}
                  <Link href={signupHref} className="font-black text-[#ff7a00] hover:underline">
                    {t("login.signUp")}
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button type="button"
                  onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                  className="flex items-center gap-1 text-sm font-bold text-black hover:underline">
                  ← {t("common.back")}
                </button>

                {resetSent ? (
                  <div className="bg-[#f0f0f0] px-5 py-5 space-y-2">
                    <p className="text-base font-black text-black">{t("login.resetSent")}</p>
                    <p className="text-sm font-semibold text-black/70">{t("reset.sent")}</p>
                    <button type="button" onClick={() => setMode("login")}
                      className="text-sm font-black text-[#ff7a00] hover:underline">
                      ← {t("common.back")}
                    </button>
                  </div>
                ) : (
                  <>
                    {resetError && (
                      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {resetError}
                      </div>
                    )}
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className={labelCls}>{t("login.email")}</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                          placeholder={t("login.emailPlaceholder")} className={inputCls} />
                      </div>
                      <HCaptcha key={forgotKey} onVerify={handleForgotToken} onExpire={() => setForgotToken("")} />
                      <button type="submit" disabled={resetLoading}
                        className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                        {resetLoading ? t("common.loading") : t("reset.submit") + " →"}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}