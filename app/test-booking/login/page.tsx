"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { createCustomerAuthSupabaseClient } from "@/lib/supabase/auth-client";
import Turnstile from "@/app/components/Turnstile";

async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/verify-captcha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

// ── Inner component uses useSearchParams — must be inside <Suspense> ──────────

function LoginForm() {
  const supabase     = useMemo(() => createCustomerBrowserClient(), []);
  const authClient   = useMemo(() => createCustomerAuthSupabaseClient(), []);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get("next") || "/test-booking/requests";

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [mode,         setMode]         = useState<"login" | "forgot">("login");
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState("");

  const [loginToken,  setLoginToken]  = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [loginKey,    setLoginKey]    = useState(0);
  const [forgotKey,   setForgotKey]   = useState(0);

  const handleLoginToken  = useCallback((t: string) => setLoginToken(t), []);
  const handleForgotToken = useCallback((t: string) => setForgotToken(t), []);

  function resetLoginCaptcha()  { setLoginToken("");  setLoginKey(k => k + 1); }
  function resetForgotCaptcha() { setForgotToken(""); setForgotKey(k => k + 1); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!loginToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const captchaOk = await verifyCaptcha(loginToken);
      if (!captchaOk) { setError("CAPTCHA verification failed. Please try again."); resetLoginCaptcha(); setLoading(false); return; }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (signInErr) throw signInErr;
      router.push(nextPath);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to sign in.");
      resetLoginCaptcha();
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      if (!forgotToken) { setResetError("Please complete the CAPTCHA."); setResetLoading(false); return; }
      const captchaOk = await verifyCaptcha(forgotToken);
      if (!captchaOk) { setResetError("CAPTCHA verification failed. Please try again."); resetForgotCaptcha(); setResetLoading(false); return; }

      document.cookie = "resetPortal=customer; domain=.camel-global.com; path=/; max-age=3600";
      const res  = await fetch("/api/auth/send-customer-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/?portal=customer` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reset email.");
      setResetSent(true);
    } catch (e: any) {
      setResetError(e?.message || "Failed to send reset email.");
      resetForgotCaptcha();
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">

        {mode === "login" ? (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">Customer Login</h1>
            <p className="mt-2 text-slate-600">Sign in to access your booking requests.</p>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-medium text-[#003768]">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#003768]">Password</label>
                  <button type="button" onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }}
                    className="text-xs font-medium text-[#005b9f] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]" />
              </div>
              <Turnstile key={loginKey} onVerify={handleLoginToken} onExpire={() => setLoginToken("")} />
              <button type="submit" disabled={loading}
                className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                {loading ? "Signing in..." : "Log In"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-600">
              Need an account?{" "}
              <Link href="/test-booking/signup" className="font-semibold text-[#003768] hover:underline">Sign up</Link>
            </p>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-[#003768] hover:underline">
              ← Back to login
            </button>
            <h1 className="text-3xl font-semibold text-[#003768]">Reset Password</h1>
            <p className="mt-2 text-slate-600">Enter your email and we'll send you a reset link.</p>

            {resetSent ? (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                <p className="font-semibold">Reset email sent ✓</p>
                <p className="mt-1">Check your inbox for a password reset link. It may take a minute to arrive.</p>
                <button type="button" onClick={() => setMode("login")} className="mt-4 text-[#003768] underline font-medium">Back to login</button>
              </div>
            ) : (
              <>
                {resetError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{resetError}</div>}
                <form onSubmit={handleForgotPassword} className="mt-8 space-y-5">
                  <div>
                    <label className="text-sm font-medium text-[#003768]">Email address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                      placeholder="your@email.com" />
                  </div>
                  <Turnstile key={forgotKey} onVerify={handleForgotToken} onExpire={() => setForgotToken("")} />
                  <button type="submit" disabled={resetLoading}
                    className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                    {resetLoading ? "Sending..." : "Send reset link"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Page export wraps LoginForm in Suspense (required for useSearchParams) ────

export default function TestBookingLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}