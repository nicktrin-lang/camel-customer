"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

const inputCls         = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const inputDisabledCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black/30 cursor-not-allowed";
const labelCls         = "block text-xs font-black uppercase tracking-widest text-black mb-2";

export default function AccountPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router   = useRouter();
  const { t }    = useTranslation();

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [fullName,      setFullName]      = useState("");
  const [phone,         setPhone]         = useState("");
  const [email,         setEmail]         = useState("");
  const [userId,        setUserId]        = useState("");
  const [confirmText,   setConfirmText]   = useState("");
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  const [emailLang,     setEmailLang]     = useState<"en" | "es">("en");
  const [langSaving,    setLangSaving]    = useState(false);
  const [langSaved,     setLangSaved]     = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?next=/account"); return; }
      const u = session.user;
      setEmail(u.email || "");
      setUserId(u.id);
      setFullName(String(u.user_metadata?.full_name || "").trim());
      setPhone(String(u.user_metadata?.phone || "").trim());
      try {
        const res = await fetch("/api/test-booking/customer-profile", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.full_name)            setFullName(json.full_name);
          if (json?.phone)                setPhone(json.phone);
          if (json?.communication_locale) setEmailLang(json.communication_locale);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), phone: phone.trim() },
      });
      if (metaErr) throw metaErr;
      const res = await fetch("/api/test-booking/customer-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: session.user.id, full_name: fullName.trim() || null, phone: phone.trim() || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save profile.");
      }
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLangSave(lang: "en" | "es") {
    setEmailLang(lang); setLangSaving(true); setLangSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const res = await fetch("/api/test-booking/customer-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: session.user.id, communication_locale: lang }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save language preference.");
      }
      setLangSaved(true);
      setTimeout(() => setLangSaved(false), 3000);
    } catch {}
    finally { setLangSaving(false); }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true); setDeleteError(null);
    try {
      const res  = await fetch("/api/test-booking/delete-account", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete account.");
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      window.location.replace("/login?reason=account_deleted");
    } catch (e: any) {
      setDeleteError(e?.message || "Something went wrong.");
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="w-full bg-black px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-white/50 font-semibold">{t("common.loading")}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("common.account")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("account.title")}</h1>
          <p className="mt-3 text-base font-semibold text-white/70">{t("account.subtitle")}</p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* Profile details */}
          <div className="bg-white p-8">
            <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-6">{t("account.profileDetails")}</p>

            {error && (
              <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
            )}
            {saved && (
              <div className="mb-5 border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">✓ {t("account.saved")}</div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelCls}>{t("account.name")}</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className={inputCls} placeholder={t("account.namePlaceholder")} />
              </div>
              <div>
                <label className={labelCls}>{t("account.phone")}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  className={inputCls} placeholder={t("account.phonePlaceholder")} />
              </div>
              <div>
                <label className={labelCls}>{t("account.email")}</label>
                <input value={email} disabled className={inputDisabledCls} />
                <p className="mt-2 text-xs font-semibold text-black/30">{t("account.emailNote")}</p>
              </div>
              <button type="submit" disabled={saving}
                className="bg-[#ff7a00] px-8 py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? t("common.loading") : t("account.saveChanges")}
              </button>
            </form>
          </div>

          {/* Email language preference */}
          <div className="bg-white p-8">
            <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-2">{t("account.emailLang.title")}</p>
            <p className="text-sm font-semibold text-black/60 mb-5">{t("account.emailLang.subtitle")}</p>
            <div className="grid grid-cols-2 gap-3">
              {(["en", "es"] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  disabled={langSaving}
                  onClick={() => handleLangSave(lang)}
                  className={`py-4 text-base font-black transition-colors ${
                    emailLang === lang
                      ? "bg-[#ff7a00] text-white"
                      : "bg-[#f0f0f0] text-black hover:bg-[#e8e8e8]"
                  }`}
                >
                  {lang === "en" ? "🇬🇧 English" : "🇪🇸 Español"}
                </button>
              ))}
            </div>
            {langSaved && (
              <p className="mt-3 text-sm font-semibold text-green-700">✓ {t("account.emailLang.saved")}</p>
            )}
          </div>

          {/* Delete account */}
          <div className="bg-white p-8">
            <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-4">{t("account.deleteTitle")}</p>
            <p className="text-base font-semibold text-black mb-2">{t("account.deleteBody")}</p>
            <p className="text-base font-semibold text-black">
              {t("account.deleteContact")}{" "}
              <span className="font-black text-black">support@camel-global.com</span>.
            </p>

            {!showConfirm ? (
              <button type="button" onClick={() => setShowConfirm(true)}
                className="mt-5 border border-red-300 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-50 transition-colors">
                {t("account.deleteRequest")}
              </button>
            ) : (
              <div className="mt-5 bg-red-50 border border-red-200 p-6 space-y-4">
                <p className="text-sm font-black text-red-800">{t("account.deleteConfirm")}</p>
                <p className="text-sm font-semibold text-red-700">{t("account.deleteTypePrompt")}</p>
                <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder={t("account.deleteTypePlaceholder")}
                  className="w-full bg-white border border-red-300 px-4 py-3 text-sm font-medium outline-none focus:border-red-500" />
                {deleteError && <p className="text-sm font-semibold text-red-700">{deleteError}</p>}
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => { setShowConfirm(false); setConfirmText(""); setDeleteError(null); }}
                    disabled={deleting}
                    className="border border-black/20 px-5 py-3 text-sm font-black text-black hover:bg-[#f0f0f0] transition-colors">
                    {t("common.cancel")}
                  </button>
                  <button type="button" onClick={handleDelete}
                    disabled={confirmText !== "DELETE" || deleting}
                    className="bg-red-600 px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                    {deleting ? t("common.loading") : t("account.deleteConfirmBtn")}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
