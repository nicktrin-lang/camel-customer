"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import HCaptcha from "@/app/components/HCaptcha";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import { useTranslation } from "@/lib/i18n/useTranslation";

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

function SignupForm() {
  const supabase     = useMemo(() => createCustomerBrowserClient(), []);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get("next") || "/bookings";
  const { t }        = useTranslation();

  const [fullName,     setFullName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey,   setCaptchaKey]   = useState(0);

  const handleCaptcha = useCallback((t: string) => setCaptchaToken(t), []);
  function resetCaptcha() { setCaptchaToken(""); setCaptchaKey(k => k + 1); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!captchaToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!captchaRes.ok) { setError("CAPTCHA verification failed."); resetCaptcha(); setLoading(false); return; }

      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail, password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), account_type: "customer" } },
      });
      if (signUpErr) throw signUpErr;

      const userId = data.user?.id;
      if (!userId) throw new Error("Could not create account.");

      const profileRes = await fetch("/api/test-booking/customer-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, full_name: fullName.trim() || null, phone: phone.trim() || null }),
      });
      if (!profileRes.ok) {
        const j = await profileRes.json().catch(() => null);
        throw new Error(j?.error || "Failed to create profile.");
      }

      if (nextPath === "/book") {
        let draft: Record<string, any> | null = null;
        try {
          const raw = sessionStorage.getItem("camel_booking_draft");
          console.log("[CAMEL DEBUG] nextPath is /book, raw draft:", raw);
          if (raw) draft = JSON.parse(raw);
        } catch {}
        console.log("[CAMEL DEBUG] parsed draft:", draft);

        if (draft?.pickupLat && draft?.pickupLng && draft?.dropoffLat && draft?.dropoffLng && draft?.pickupAt && draft?.dropoffAt) {
          const pAt = draft.pickupAt, dAt = draft.dropoffAt;
          const diffMs = new Date(dAt).getTime() - new Date(pAt).getTime();
          const duration = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) * 24 * 60 : null;

          if (duration) {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            const token = newSession?.access_token;
            console.log("[CAMEL DEBUG] draft found, duration:", duration, "token present:", !!token, "session:", newSession);

            if (token) {
              const bookRes = await fetch("/api/test-booking/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  pickup_address: draft.pickupAddress, pickup_lat: draft.pickupLat, pickup_lng: draft.pickupLng,
                  dropoff_address: draft.dropoffAddress, dropoff_lat: draft.dropoffLat, dropoff_lng: draft.dropoffLng,
                  pickup_at: pAt, dropoff_at: dAt,
                  journey_duration_minutes: duration,
                  passengers: Number(draft.passengers || 2),
                  suitcases: Number(draft.suitcases || 1),
                  sport_equipment: draft.sportEquipment && draft.sportEquipment !== "none" ? draft.sportEquipment : null,
                  vehicle_category_slug: draft.vehicleSlug || FLEET_CATEGORIES[0]?.slug,
                  vehicle_category_name: (FLEET_CATEGORIES.find((c: any) => c.slug === draft!.vehicleSlug) || FLEET_CATEGORIES[0])?.name,
                  notes: draft.notes || "",
                }),
              });
              const bookJson = await bookRes.json().catch(() => null);
              console.log("[CAMEL DEBUG] booking API response:", bookRes.status, bookJson);
              if (bookRes.ok && bookJson?.data?.id) {
                sessionStorage.removeItem("camel_booking_draft");
                router.push(`/bookings/${bookJson.data.id}`);
                return;
              }
            }
          }
        }
      }

      router.push(nextPath);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create account.");
      resetCaptcha();
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("common.account")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("signup.title")}.</h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            Start booking meet &amp; greet car hire in minutes.
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-12">
        <div className="mx-auto max-w-lg">
          <div className="bg-white p-8 space-y-5">

            {error && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>{t("signup.name")}</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} required
                  className={inputCls} placeholder="Your full name" />
              </div>
              <div>
                <label className={labelCls}>
                  Phone <span className="text-black/40 font-semibold normal-case tracking-normal">(optional)</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  className={inputCls} placeholder="+44 7700 000000" />
              </div>
              <div>
                <label className={labelCls}>{t("signup.email")}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className={inputCls} placeholder="your@email.com" />
              </div>
              <div>
                <label className={labelCls}>{t("signup.password")}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className={inputCls} placeholder="Min. 8 characters" />
              </div>
              <HCaptcha key={captchaKey} onVerify={handleCaptcha} onExpire={() => setCaptchaToken("")} />
              <button type="submit" disabled={loading}
                className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                {loading ? t("common.loading") : t("signup.submit") + " →"}
              </button>
            </form>

            <p className="text-center text-sm font-semibold text-black">
              {t("signup.haveAccount")}{" "}
              <Link
                href={nextPath !== "/bookings" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
                className="font-black text-[#ff7a00] hover:underline"
              >
                {t("signup.signIn")}
              </Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}