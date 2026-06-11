"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

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
  const [resetTokens, setResetTokens]   = useState<{ at: string; rt: string } | null>(null);

  useEffect(() => {
    async function init() {
      const hash      = window.location.hash.substring(1);
      const params    = new URLSearchParams(hash);
      const at        = params.get("access_token");
      const rt        = params.get("refresh_token");
      const errorCode = params.get("error_code");

      if (errorCode) { setSessionError("This reset link has expired or is invalid. Please request a new one."); return; }
      if (at && rt) {
        setResetTokens({ at, rt });
        setSessionReady(true);
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
      if (resetTokens) {
        const { error: sessErr } = await authClient.auth.setSession({ access_token: resetTokens.at, refresh_token: resetTokens.rt });
        if (sessErr) throw new Error("Reset link expired. Please request a new one.");
      }
      const { error } = await authClient.auth.updateUser({ password });
      if (error) throw error;
      await authClient.auth.signOut();
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (e: any) {
      setError(e?.message || "Failed to update password.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            {t("common.account")}
          </p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            {t("reset.title")}
          </h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            {t("reset.subtitle") || "Choose a new password for your account."}
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-12 flex-1">
        <div className="mx-auto max-w-md">
          <div className="bg-white p-8 space-y-5">
            {sessionError ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">Link Expired</p>
                <h2 className="text-2xl font-black text-black">{sessionError}</h2>
                <Link href="/login"
                  className="inline-block bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity">
                  ← {t("common.back")}
                </Link>
              </>
            ) : success ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">✓ {t("reset.success")}</p>
                <h2 className="text-2xl font-black text-black">Redirecting you to login…</h2>
              </>
            ) : !sessionReady ? (
              <p className="text-sm font-semibold text-black/50">{t("common.loading")}</p>
            ) : (
              <>
                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={labelCls}>{t("reset.newPassword")}</label>
                    <input
                      type="password" required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm new password</label>
                    <input
                      type="password" required autoComplete="new-password"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {loading ? t("common.loading") : t("reset.updatePassword") + " →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen bg-white" />}><ResetPasswordInner /></Suspense>;
}
