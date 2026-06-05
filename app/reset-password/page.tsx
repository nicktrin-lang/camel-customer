"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

function ResetPasswordInner() {
  const authClient = useMemo(() => createCustomerAuthSupabaseClient(), []);
  const supabase   = useMemo(() => createCustomerBrowserClient(), []);
  const router     = useRouter();
  const { t }      = useTranslation();

  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    async function init() {
      const hash      = window.location.hash.substring(1);
      const params    = new URLSearchParams(hash);
      const at        = params.get("access_token");
      const rt        = params.get("refresh_token");
      const errorCode = params.get("error_code");

      if (errorCode) { setSessionError("This reset link has expired or is invalid. Please request a new one."); return; }
      if (at && rt) {
        const { error } = await authClient.auth.setSession({ access_token: at, refresh_token: rt });
        if (error) setSessionError("This reset link has expired or is invalid.");
        else setSessionReady(true);
        return;
      }
      const { data } = await authClient.auth.getSession();
      if (data?.session) { setSessionReady(true); return; }
      const { data: d2 } = await supabase.auth.getSession();
      if (d2?.session) { setSessionReady(true); return; }
      setSessionError("This reset link has expired or is invalid. Please request a new one.");
    }
    init();
  }, [authClient, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const { error } = await authClient.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (e: any) {
      setError(e?.message || "Failed to update password.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          {sessionError ? (
            <>
              <h1 className="text-3xl font-black text-[#003768]">Link Expired</h1>
              <p className="mt-2 text-slate-600">{sessionError}</p>
              <a href="/login" className="mt-6 inline-block rounded-full bg-[#ff7a00] px-6 py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95">
                ← {t("common.back")}
              </a>
            </>
          ) : success ? (
            <>
              <h1 className="text-3xl font-black text-[#003768]">{t("reset.success")} ✓</h1>
              <p className="mt-2 text-slate-600">Redirecting you to login…</p>
            </>
          ) : !sessionReady ? (
            <p className="text-slate-600">{t("common.loading")}</p>
          ) : (
            <>
              <h1 className="text-3xl font-black text-[#003768]">{t("reset.title")}</h1>
              <p className="mt-1 text-slate-500">Choose a new password for your account.</p>
              {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#003768] mb-1.5">{t("reset.newPassword")}</label>
                  <input type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#003768] mb-1.5">Confirm new password</label>
                  <input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-[#ff7a00] py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-60">
                  {loading ? t("common.loading") : t("reset.updatePassword")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}><ResetPasswordInner /></Suspense>;
}