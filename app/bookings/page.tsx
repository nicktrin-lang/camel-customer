"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

type RequestRow = {
  id: string;
  job_number: number | null;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  dropoff_at: string | null;
  vehicle_category_name: string | null;
  status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  open:      "bg-amber-100 text-amber-800",
  confirmed: "bg-black text-white",
  collected: "bg-black text-white",
  returned:  "bg-black text-white",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  expired:   "bg-[#f0f0f0] text-black/40",
};

function useStatusLabel() {
  const { t } = useTranslation();
  return (s: string) => {
    switch (s) {
      case "open":      return t("bookings.status.pending");
      case "confirmed": case "driver_assigned": case "en_route": case "arrived": return t("bookings.status.confirmed");
      case "collected": case "returned": return "On Hire";
      case "completed": return t("bookings.status.completed");
      case "cancelled": return t("bookings.status.cancelled");
      case "expired":   return "Expired";
      default: return s.replaceAll("_", " ");
    }
  };
}

export default function BookingsPage() {
  const supabase    = useMemo(() => createCustomerBrowserClient(), []);
  const router      = useRouter();
  const { t }       = useTranslation();
  const statusLabel = useStatusLabel();

  const [rows,      setRows]      = useState<RequestRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?next=/bookings"); return; }
      try {
        const res  = await fetch("/api/test-booking/requests", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load bookings.");
        setRows(json.data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, router]);

  const active    = rows.filter(r => ["open","confirmed","driver_assigned","en_route","arrived","collected","returned"].includes(r.status));
  const completed = rows.filter(r => r.status === "completed");
  const cancelled = rows.filter(r => r.status === "cancelled");

  const tabs = [
    { key: "active",    label: "Active",    count: active.length,    items: active,    bar: "bg-[#ff7a00]" },
    { key: "completed", label: t("bookings.status.completed"), count: completed.length, items: completed, bar: "bg-green-500" },
    { key: "cancelled", label: t("bookings.status.cancelled"), count: cancelled.length, items: cancelled, bar: "bg-red-500" },
    { key: "all",       label: "All",       count: rows.length,      items: rows,      bar: "bg-black" },
  ];

  const currentTab = tabs.find(tab => tab.key === activeTab) ?? tabs[0];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("common.account")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("bookings.title")}</h1>
          <p className="mt-3 text-base font-semibold text-white/70">Track your car hire requests and bookings.</p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-4">
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`text-left p-6 transition-colors ${activeTab === tab.key ? "bg-black text-white" : "bg-white hover:bg-[#e8e8e8] text-black"}`}>
                <div className={`h-1 w-10 ${tab.bar} mb-4`} />
                <p className={`text-4xl font-black ${activeTab === tab.key ? "text-white" : "text-black"}`}>{tab.count}</p>
                <p className={`text-sm font-bold mt-1 ${activeTab === tab.key ? "text-white/70" : "text-black/50"}`}>{tab.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full bg-white px-6 py-10 flex-1">
        <div className="mx-auto max-w-5xl">

          {error && (
            <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="bg-[#f0f0f0] p-8">
              <p className="text-base font-semibold text-black/50">{t("common.loading")}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-[#f0f0f0] p-12 text-center">
              <p className="text-4xl mb-4">🚗</p>
              <h2 className="text-2xl font-black text-black mb-2">{t("bookings.empty")}</h2>
              <p className="text-base font-semibold text-black/50 mb-6">
                Create your first car hire request and receive bids from local car hire companies.
              </p>
              <Link href="/book"
                className="inline-block bg-[#ff7a00] px-8 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
                {t("common.bookNow")}
              </Link>
            </div>
          ) : currentTab.items.length === 0 ? (
            <div className="bg-[#f0f0f0] p-10 text-center">
              <p className="text-base font-semibold text-black/50">No {currentTab.label.toLowerCase()} bookings.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTab.items.map(r => (
                <Link key={r.id} href={`/bookings/${r.id}`}
                  className="block bg-[#f0f0f0] p-5 hover:bg-[#e8e8e8] transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base font-black text-black">#{r.job_number ?? "—"}</span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-black uppercase tracking-wide ${STATUS_STYLES[r.status] || STATUS_STYLES.open}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-black truncate">📍 {r.pickup_address}</p>
                      {r.dropoff_address && (
                        <p className="text-sm font-semibold text-black/50 truncate">🏁 {r.dropoff_address}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-black/40">
                        <span>🗓 {r.pickup_at ? new Date(r.pickup_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                        {r.vehicle_category_name && <span>🚗 {r.vehicle_category_name}</span>}
                        <span>Created {new Date(r.created_at).toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>
                    <span className="text-black font-black text-lg">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}