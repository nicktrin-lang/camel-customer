"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";
import HCaptcha from "@/app/components/HCaptcha";

export default function TestBookingSignupPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router   = useRouter();
  const { locale } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [phone,    setPhone]    = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey,   setCaptchaKey]   = useState(0);

  const handleCaptcha = useCallback((t: string) => setCaptchaToken(t), []);

  function resetCaptcha() {
    setCaptchaToken("");
    setCaptchaKey(k => k + 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);

    try {
      if (!captchaToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!captchaRes.ok) { setError("CAPTCHA verification failed. Please try again."); resetCaptcha(); setLoading(false); return; }

      const cleanEmail = email.trim().toLowerCase();

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            account_type: "customer",
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const userId = data.user?.id;
      if (!userId) throw new Error("Could not create customer account.");

      const profileRes = await fetch("/api/test-booking/customer-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:   userId,
          full_name: fullName.trim() || null,
          phone:     phone.trim() || null,
          // Default email language from the signup UI language (no country for customers).
          communication_locale: locale,
        }),
      });
      if (!profileRes.ok) {
        const profileJson = await profileRes.json().catch(() => null);
        throw new Error(profileJson?.error || "Failed to create profile.");
      }

      router.push("/test-booking/requests");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create customer account.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h1 className="text-3xl font-semibold text-[#003768]">Test Customer Sign Up</h1>
        <p className="mt-2 text-slate-600">
          Create a separate customer account for booking flow testing.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required />
          </div>
          <div>
            <label className="text-sm font-medium text-[#003768]">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#003768]">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required />
          </div>
          <div>
            <label className="text-sm font-medium text-[#003768]">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required />
          </div>
          <HCaptcha key={captchaKey} onVerify={handleCaptcha} onExpire={() => setCaptchaToken("")} />
          <button type="submit" disabled={loading}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {loading ? "Creating..." : "Create Customer Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/test-booking/login" className="font-semibold text-[#003768]">Log in</Link>
        </p>
      </div>
    </div>
  );
}