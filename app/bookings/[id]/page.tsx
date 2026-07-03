"use client";

import Link from "next/link";
import { currencyLocale } from "@/lib/currency";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Currency = "EUR" | "GBP" | "USD" | "AUD" | "NZD" | "CAD";

type RequestData = {
  id: string; job_number: number|null; pickup_address: string;
  dropoff_address: string|null; pickup_at: string; dropoff_at: string|null;
  journey_duration_minutes: number|null; passengers: number; suitcases: number;
  hand_luggage: number; sport_equipment: string|null;
  vehicle_category_name: string|null; notes: string|null;
  status: string; created_at: string; expires_at: string|null;
  driver_age: number|null;
  additional_drivers: number;
  additional_driver_ages: string|null;
};
type BidRow = {
  id: string; partner_user_id: string; partner_company_name: string|null;
  partner_contact_name: string|null; partner_phone: string|null;
  partner_address: string|null; vehicle_category_name: string;
  car_hire_price: number; fuel_price: number; total_price: number;
  full_insurance_included: boolean; full_tank_included: boolean;
  notes: string|null; status: string; created_at: string;
  currency: Currency; avg_rating: number|null; review_count: number;
  mileage_limit: string|null;
  security_deposit_notes: string|null;
};
type ExistingReview = {
  id: string; rating: number; comment: string|null;
  partner_reply: string|null; partner_replied_at: string|null; created_at: string;
};
type PostCompletionRefund = {
  id: string; amount: number; reason: string | null;
  stripe_refund_id: string | null; created_at: string;
};

type BookingData = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number|null; notes: string|null;
  created_at: string; job_number: number|null; assigned_driver_id?: string|null;
  company_name: string|null; company_phone: string|null;
  driver_name: string|null; driver_phone: string|null;
  driver_vehicle: string|null; driver_notes: string|null; driver_assigned_at: string|null;
  fuel_price: number|null; car_hire_price: number|null;
  fuel_used_quarters: number|null; fuel_charge: number|null; fuel_refund: number|null;
  currency: Currency; charge_currency: Currency|null;
  cancelled_by?: string|null; cancelled_at?: string|null;
  cancellation_reason?: string|null; refund_status?: string|null;
  collection_confirmed_by_driver: boolean; collection_confirmed_by_driver_at: string|null;
  collection_fuel_level_driver: string|null;
  return_confirmed_by_driver: boolean; return_confirmed_by_driver_at: string|null;
  return_fuel_level_driver: string|null;
  collection_confirmed_by_partner: boolean; collection_confirmed_by_partner_at: string|null;
  collection_fuel_level_partner: string|null; collection_partner_notes: string|null;
  return_confirmed_by_partner: boolean; return_confirmed_by_partner_at: string|null;
  return_fuel_level_partner: string|null; return_partner_notes: string|null;
  collection_confirmed_by_customer: boolean; collection_confirmed_by_customer_at: string|null;
  collection_fuel_level_customer: string|null; collection_customer_notes: string|null;
  return_confirmed_by_customer: boolean; return_confirmed_by_customer_at: string|null;
  return_fuel_level_customer: string|null; return_customer_notes: string|null;
  insurance_docs_confirmed_by_driver: boolean; insurance_docs_confirmed_by_driver_at: string|null;
  insurance_docs_confirmed_by_customer: boolean; insurance_docs_confirmed_by_customer_at: string|null;
  has_review: boolean; existing_review: ExistingReview|null;
  post_completion_refund_total?: number|null;
  postCompletionRefunds?: PostCompletionRefund[];
  mileage_limit: string|null;
  security_deposit_amount: number|null;
  security_deposit_notes: string|null;
};
type ResponseShape = { request: RequestData; bids: BidRow[]; booking: BookingData|null };
type ConfirmSection = "collection"|"return";

// t() type — minimal signature matching useTranslation hook output
type TFn = (key: string, vars?: Record<string, string>) => string;

const HOURS_48 = 48*60*60*1000;
const PRE_COLLECTION = ["confirmed","driver_assigned","en_route","arrived"];

function normalizeFuel(v: unknown): string|null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s==="empty") return "empty"; if (s==="quarter") return "quarter";
  if (s==="half") return "half"; if (s==="three_quarter"||s==="3/4") return "3/4";
  if (s==="full") return "full"; return null;
}

// Translate fuel level value using i18n keys
function fuelLabel(v: unknown, t: TFn): string {
  switch(normalizeFuel(v)) {
    case "empty":   return t("home.fuel.empty");
    case "quarter": return t("home.fuel.quarter");
    case "half":    return t("home.fuel.half");
    case "3/4":     return t("home.fuel.three");
    case "full":    return t("home.fuel.full");
    default:        return "—";
  }
}

// Translate quarter count (0–4) to fuel label
function quarterLabel(n: number, t: TFn): string {
  switch(n) {
    case 0: return t("home.fuel.empty");
    case 1: return t("home.fuel.quarter");
    case 2: return t("home.fuel.half");
    case 3: return t("home.fuel.three");
    case 4: return t("home.fuel.full");
    default: return `${n}/4`;
  }
}

const FUEL_BARS_MAP: Record<string,number> = { empty:0, quarter:1, half:2, "3/4":3, full:4 };

function FuelBar({ level, light }: { level: string|null; light?: boolean }) {
  const n = normalizeFuel(level); const filled = n?(FUEL_BARS_MAP[n]??0):0;
  return (
    <div className="flex gap-1 mt-2">
      {[0,1,2,3].map(i=>(
        <div key={i} className={`h-3 flex-1 ${i<filled?filled>=3?"bg-green-500":filled===2?"bg-yellow-400":"bg-red-400":light?"bg-white/20":"bg-[#f0f0f0]"}`}/>
      ))}
    </div>
  );
}

const LOCALE_MAP: Record<Currency,string> = { EUR:"es-ES", GBP:"en-GB", USD:"en-US", AUD:"en-AU", NZD:"en-NZ", CAD:"en-CA" };
function fmtCurr(a: number, c: Currency) {
  return new Intl.NumberFormat(LOCALE_MAP[c],{style:"currency",currency:c}).format(a);
}

function fmt(v?: string|null) { if (!v) return "—"; try { return new Date(v).toLocaleString(); } catch { return v; } }
function formatDuration(m?: number|null) {
  if (!m) return "—";
  if (m>=1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)===1?"":"s"}`;
  if (m<60) return `${m} min`;
  const h=Math.floor(m/60),mins=m%60; return mins?`${h}h ${mins}m`:`${h}h`;
}
function getTimeRemaining(expiresAt?: string|null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime()-Date.now();
  if (diff<=0) return { expired:true, label:"Expired" };
  const s=Math.floor(diff/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return { expired:false, label:d>0?`${d}d ${h}h ${m}m`:h>0?`${h}h ${m}m ${sec}s`:`${m}m ${sec}s` };
}

const SPORT_KEY_MAP: Record<string, string> = {
  golf_single:"sport.golf1", golf_two:"sport.golf2", golf_three:"sport.golf3", golf_four:"sport.golf4",
  skis_pair:"sport.skis1", skis_two:"sport.skis2", skis_three:"sport.skis3",
  bikes_one:"sport.bikes1", bikes_two:"sport.bikes2", bikes_three:"sport.bikes3",
  other:"sport.other", none:"sport.none",
};

const BAD_WORDS = ["fuck","shit","cunt","bastard","asshole","dick","bitch","wanker","puta","mierda","coño","joder","hostia","gilipollas"];
function containsBadWords(t: string) { return BAD_WORDS.some(w=>t.toLowerCase().includes(w)); }

function StarPicker({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  const [hovered,setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)} onClick={()=>onChange(n)} className="text-3xl leading-none transition-transform hover:scale-110">
          <span className={(hovered||value)>=n?"text-amber-400":"text-black/10"}>★</span>
        </button>
      ))}
    </div>
  );
}

function CustomerCancellationSummary({ bk }: { bk: BookingData }) {
  const { t } = useTranslation();
  const curr: Currency = bk.currency ?? "EUR";
  const carHire  = Number(bk.car_hire_price || 0);
  const fuel     = Number(bk.fuel_price || 0);
  const total    = carHire + fuel;
  const isFull   = bk.refund_status === "full";
  const isPartial = bk.refund_status === "partial";
  const within48 = isPartial;
  const carHireRefund  = isFull ? carHire : 0;
  const fuelRefund     = fuel;
  const totalRefund    = carHireRefund + fuelRefund;
  const nonRefundable  = isPartial ? carHire : 0;
  const cancelledByLabel = bk.cancelled_by === "partner"
    ? t("booking.cancelled.by.partner")
    : bk.cancelled_by === "admin"
    ? t("booking.cancelled.by.admin")
    : t("booking.cancelled.by.you");
  return (
    <div className="border border-red-200 bg-red-50 px-6 py-5 space-y-5">
      <div>
        <p className="text-base font-black text-red-800">{t("booking.cancelled.title")}</p>
        <p className="text-sm font-semibold text-red-600 mt-1">{t("booking.cancelled.cancelledBy", { who: cancelledByLabel, date: fmt(bk.cancelled_at) })}</p>
        {bk.cancellation_reason && <p className="text-sm font-semibold text-red-600">{t("booking.cancelled.reason", { reason: bk.cancellation_reason })}</p>}
      </div>
      <div className={`px-4 py-3 text-sm font-semibold border ${within48?"bg-amber-50 border-amber-300 text-amber-800":"bg-green-50 border-green-300 text-green-800"}`}>
        {within48 ? t("booking.cancelled.within48") : t("booking.cancelled.outside48")}
      </div>
      <div className="bg-white border border-red-100 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">{t("booking.cancelled.whatYouPaid")}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("booking.cancelled.carHire")}</span><span className="font-black text-black">{fmtCurr(carHire,curr)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("booking.cancelled.fuelDeposit")}</span><span className="font-black text-black">{fmtCurr(fuel,curr)}</span></div>
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black/60">{t("booking.cancelled.totalPaid")}</span><span className="text-black">{fmtCurr(total,curr)}</span></div>
        </div>
      </div>
      <div className="bg-white border border-red-100 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">{t("booking.cancelled.yourRefund")}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("booking.cancelled.carHireRefund")}</span><span className={`font-black ${carHireRefund>0?"text-green-700":"text-red-500"}`}>{carHireRefund>0?fmtCurr(carHireRefund,curr):t("booking.cancelled.notRefunded")}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("booking.cancelled.fuelRefund")}</span><span className="font-black text-green-700">{fmtCurr(fuelRefund,curr)}</span></div>
          {nonRefundable>0&&<div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("booking.cancelled.nonRefundable")}</span><span className="font-black text-red-600">{fmtCurr(nonRefundable,curr)}</span></div>}
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black">{t("booking.cancelled.totalRefund")}</span><span className="text-green-700 text-base">{fmtCurr(totalRefund,curr)}</span></div>
        </div>
      </div>
      <p className="text-xs font-semibold text-black/50">{t("booking.cancelled.refundNote")}</p>
    </div>
  );
}

function CompletionStatementButton({ bookingId, accessToken }: { bookingId: string; accessToken: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string|null>(null);
  const { t } = useTranslation();
  async function handleDownload() {
    setLoading(true); setErr(null);
    try {
      const res  = await fetch(`/api/test-booking/bookings/${bookingId}/completion-statement`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) throw new Error(json?.error || "Failed to get statement");
      window.open(json.url, "_blank");
    } catch (e: any) { setErr(e?.message || "Failed to download statement"); }
    finally { setLoading(false); }
  }
  return (
    <div>
      <button type="button" onClick={handleDownload} disabled={loading}
        className="inline-flex items-center gap-2 border border-[#ff7a00] px-5 py-2.5 text-sm font-black text-[#ff7a00] hover:bg-[#ff7a00] hover:text-white transition-colors disabled:opacity-50">
        {loading ? t("common.loading") : `⬇ ${t("booking.completionStatement")}`}
      </button>
      {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
    </div>
  );
}

function BookingSummaryCard({ bk, accessToken }: { bk: BookingData; accessToken: string }) {
  const { t } = useTranslation();
  const curr: Currency  = bk.currency ?? "EUR";
  const fmt2 = (n: number) => fmtCurr(n, curr);
  const carHireAmt  = Number(bk.car_hire_price||0);
  const fullTankAmt = Number(bk.fuel_price||0);
  const totalAmt    = Number(bk.amount||0);
  const fuelCharge  = bk.fuel_charge??null;
  const fuelRefund  = bk.fuel_refund??null;
  const perQtrAmt   = fullTankAmt/4;
  const usedQ       = bk.fuel_used_quarters??null;
  const collFuel = normalizeFuel(bk.collection_fuel_level_partner)||normalizeFuel(bk.collection_fuel_level_driver)||normalizeFuel(bk.collection_fuel_level_customer);
  const retFuel  = normalizeFuel(bk.return_fuel_level_partner)||normalizeFuel(bk.return_fuel_level_driver)||normalizeFuel(bk.return_fuel_level_customer);
  return (
    <>
      <div className="bg-[#003768] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/50">{t("booking.summary.heading")}</p>
          <span className="bg-green-400 px-3 py-1 text-xs font-black text-green-900">{t("booking.summary.finalised")}</span>
        </div>
        <div className="bg-white/10 p-4 mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">{t("booking.summary.totalValue")}</p>
          <p className="text-3xl font-black text-white">{fmt2(totalAmt)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black text-white/50 uppercase tracking-wide">{t("booking.summary.carHire")}</p><p className="font-bold text-white">{fmt2(carHireAmt)}</p></div>
            <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black text-white/50 uppercase tracking-wide">{t("booking.summary.fuelDeposit")}</p><p className="font-bold text-white">{fmt2(fullTankAmt)}</p></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          {[
            {label:t("booking.summary.deliveryFuel"),  value:fuelLabel(collFuel, t), bar:collFuel},
            {label:t("booking.summary.collectionFuel"),value:fuelLabel(retFuel, t),  bar:retFuel},
            {label:t("booking.summary.fuelUsed"),      value:usedQ!==null?quarterLabel(usedQ, t):"—", bar:null},
            {label:t("booking.summary.perQuarter"),    value:fmt2(perQtrAmt), bar:null}
          ].map(({label,value,bar})=>(
            <div key={label} className="bg-white/10 p-3"><p className="text-xs font-black text-white/50 uppercase tracking-wide mb-1">{label}</p><p className="font-black text-white">{value}</p>{bar&&<FuelBar level={bar} light/>}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#ff7a00]/20 border border-[#ff7a00]/40 p-4"><p className="text-xs font-black text-white/70 uppercase tracking-wide mb-2">{t("booking.summary.fuelCharge")}</p><p className="text-2xl font-black text-white">{fuelCharge!=null?fmt2(fuelCharge):"—"}</p></div>
          <div className="bg-green-500/20 border border-green-400/40 p-4"><p className="text-xs font-black text-white/70 uppercase tracking-wide mb-2">{t("booking.summary.refund")}</p><p className="text-2xl font-black text-white">{fuelRefund!=null?fmt2(fuelRefund):"—"}</p></div>
        </div>
      </div>
      {(bk.postCompletionRefunds ?? []).length > 0 && (
        <div className="bg-amber-50 border-t-2 border-amber-300 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3">Post-Completion Adjustments</p>
          {(bk.postCompletionRefunds ?? []).map((r, i) => (
            <div key={r.id} className="flex items-start justify-between py-2 border-b border-amber-100 last:border-0">
              <span className="text-sm font-semibold text-amber-800">
                Refund {i + 1}{r.reason ? ` — ${r.reason}` : ""}
                <span className="ml-2 text-xs text-amber-600">{new Date(r.created_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</span>
              </span>
              <span className="text-sm font-black text-amber-700 ml-4 shrink-0">− {fmt2(r.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 mt-1 border-t-2 border-amber-300">
            <span className="text-sm font-black text-amber-800">Total refunded</span>
            <span className="text-sm font-black text-amber-700">− {fmt2(Number(bk.post_completion_refund_total ?? 0))}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-sm font-black text-black">Net amount after adjustments</span>
            <span className="text-sm font-black text-black">{fmt2((Number(bk.car_hire_price||0) + Number(bk.fuel_charge||0)) - Number(bk.post_completion_refund_total ?? 0))}</span>
          </div>
          <p className="mt-3 text-xs font-semibold text-amber-600">Refunds issued to your original payment method. Please allow 5–10 business days to appear. Download your amended statement below.</p>
        </div>
      )}
      <div className="bg-white p-6">
        <p className="text-xs font-black uppercase tracking-widest text-black mb-4">{t("booking.summary.documents")}</p>
        <CompletionStatementButton bookingId={bk.id} accessToken={accessToken} />
      </div>
    </>
  );
}

function ReviewCard({ bookingId, accessToken, existingReview, onReviewSubmitted }: { bookingId:string; accessToken:string; existingReview:ExistingReview|null; onReviewSubmitted:()=>void }) {
  const [rating,setRating]       = useState(existingReview?.rating??0);
  const [comment,setComment]     = useState(existingReview?.comment??"");
  const [saving,setSaving]       = useState(false);
  const [error,setError]         = useState<string|null>(null);
  const [submitted,setSubmitted] = useState(!!existingReview);
  const { t } = useTranslation();
  async function submit() {
    if (!rating) { setError(t("booking.review.error.rating")); return; }
    if (comment&&containsBadWords(comment)) { setError(t("booking.review.error.badWords")); return; }
    setSaving(true); setError(null);
    try {
      const res=await fetch("/api/test-booking/reviews",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({booking_id:bookingId,rating,comment})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to submit review");
      setSubmitted(true); onReviewSubmitted();
    } catch(e:any) { setError(e?.message); }
    finally { setSaving(false); }
  }
  return (
    <div id="review" className="bg-white p-6">
      <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-3">⭐ {submitted ? t("booking.review.thanks") : t("booking.review.title")}</p>
      <p className="text-sm font-semibold text-black/50 mb-4">{submitted ? t("booking.review.thanks") : t("booking.review.experience")}</p>
      {submitted?(
        <>
          <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(n=><span key={n} className={`text-2xl ${n<=rating?"text-amber-400":"text-black/10"}`}>★</span>)}</div>
          {comment&&<p className="text-base font-semibold text-black">{comment}</p>}
          {existingReview?.partner_reply&&(
            <div className="mt-4 bg-[#f0f0f0] px-4 py-3"><p className="text-xs font-black uppercase tracking-widest text-black mb-1">{t("booking.review.partnerReply")} · {fmt(existingReview.partner_replied_at)}</p><p className="text-sm font-semibold text-black">{existingReview.partner_reply}</p></div>
          )}
        </>
      ):(
        <>
          <div className="mb-4"><StarPicker value={rating} onChange={setRating}/></div>
          <textarea rows={3} value={comment} onChange={e=>setComment(e.target.value)} className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] placeholder:text-black/30 resize-none mb-3" placeholder={t("booking.review.placeholder")}/>
          {error&&<p className="text-sm font-semibold text-red-600 mb-3">{error}</p>}
          <button type="button" onClick={submit} disabled={saving||!rating} className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? t("common.loading") : t("booking.review.submit")}
          </button>
        </>
      )}
    </div>
  );
}

function InsuranceConfirmCard({ driverConfirmed,driverConfirmedAt,customerConfirmed,customerConfirmedAt,insuranceChecked,onInsuranceChange,onConfirm,onUnconfirm,saving,locked }: { driverConfirmed:boolean;driverConfirmedAt:string|null;customerConfirmed:boolean;customerConfirmedAt:string|null;insuranceChecked:boolean;onInsuranceChange:(v:boolean)=>void;onConfirm:()=>void;onUnconfirm:()=>void;saving:boolean;locked:boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`p-6 ${locked?"bg-green-50 border border-green-200":"bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-widest text-black mb-1">{t("booking.insurance.heading")}</p>
      <p className="text-sm font-semibold text-black/50 mb-4">{t("booking.insurance.subtitle")}</p>
      <div className={`px-4 py-3 mb-4 ${driverConfirmed?"bg-black":"bg-[#f0f0f0]"}`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${driverConfirmed?"text-white":"text-black/50"}`}>{t("booking.insurance.driverConfirmed")}</p>
        {driverConfirmed?<><p className="text-base font-black text-white">✓ {t("booking.insurance.driverConfirmed")}</p><p className="text-xs text-white/70">{fmt(driverConfirmedAt)}</p></>:<p className="text-sm font-semibold text-black/40">{t("booking.insurance.driverWaiting")}</p>}
      </div>
      {locked?(
        <div className="bg-green-100 px-4 py-3 text-sm font-black text-green-800">{t("booking.insurance.bothConfirmed")}</div>
      ):(
        <>
          {customerConfirmed&&<div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black mb-4">{t("booking.insurance.youConfirmed", { time: fmt(customerConfirmedAt) })}</div>}
          {!customerConfirmed&&(
            <label className={`flex items-start gap-3 p-3 cursor-pointer mb-4 border-2 transition ${insuranceChecked?"border-green-400 bg-green-50":"border-black/10 bg-[#f0f0f0]"}`}>
              <input type="checkbox" checked={insuranceChecked} onChange={e=>onInsuranceChange(e.target.checked)} disabled={!driverConfirmed||saving} className="mt-0.5 h-5 w-5 shrink-0"/>
              <p className="text-sm font-bold text-black">{t("booking.insurance.checkbox")}</p>
            </label>
          )}
          <div className="flex gap-3">
            {!customerConfirmed?(
              <button type="button" onClick={onConfirm} disabled={saving||!driverConfirmed||!insuranceChecked} className="flex-1 bg-[#ff7a00] py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving?t("common.loading"):!driverConfirmed?t("booking.insurance.waitingDriver"):!insuranceChecked?t("booking.insurance.checkbox"):t("booking.insurance.confirmBtn")}
              </button>
            ):(
              <button type="button" onClick={onUnconfirm} disabled={saving} className="flex-1 bg-[#f0f0f0] py-4 text-sm font-black text-black hover:bg-[#e8e8e8] disabled:opacity-50">{saving?t("common.loading"):t("booking.insurance.dispute")}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FuelConfirmCard({ title,effectiveFuel,effectiveReady,effectiveReadyAt,customerConfirmed,customerConfirmedAt,locked,notes,onNotesChange,onConfirm,onUnconfirm,saving,partnerOverrideActive }: {
  title:string; effectiveFuel:string|null; effectiveReady:boolean; effectiveReadyAt:string|null;
  customerConfirmed:boolean; customerConfirmedAt:string|null; locked:boolean; notes:string;
  onNotesChange:(v:string)=>void; onConfirm:()=>void; onUnconfirm:()=>void; saving:boolean; partnerOverrideActive:boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`p-6 ${locked?"bg-green-50 border border-green-200":"bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-widest text-black mb-4">{title}</p>
      <div className={`px-4 py-3 mb-4 ${effectiveReady&&effectiveFuel?"bg-black":"bg-[#f0f0f0]"}`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${effectiveReady&&effectiveFuel?"text-white":"text-black/50"}`}>
          {partnerOverrideActive ? t("booking.fuel.officeRecorded") : t("booking.fuel.driverRecorded")}
        </p>
        {effectiveReady&&effectiveFuel
          ? <><p className="text-2xl font-black text-white">{fuelLabel(effectiveFuel, t)}</p><FuelBar level={effectiveFuel} light/>{partnerOverrideActive&&<p className="text-xs text-[#ff7a00] mt-1 font-black">{t("booking.fuel.officeOverride")}</p>}<p className="text-xs text-white/70 mt-1">{fmt(effectiveReadyAt)}</p></>
          : <p className="text-sm font-semibold text-black/40">{t("booking.fuel.waiting")}</p>}
      </div>
      {locked?(
        <div className="bg-green-100 px-4 py-3 text-sm font-black text-green-800">{t("booking.fuel.confirmed", { who: partnerOverrideActive ? t("booking.fuel.officeRecorded").toLowerCase() : t("booking.fuel.driverRecorded").toLowerCase(), level: fuelLabel(effectiveFuel, t) })}</div>
      ):(
        <>
          {customerConfirmed&&<div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black mb-4">{t("booking.fuel.youConfirmed", { time: fmt(customerConfirmedAt) })}</div>}
          <textarea rows={3} value={notes} onChange={e=>onNotesChange(e.target.value)} disabled={locked} className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] disabled:opacity-50 resize-none mb-4" placeholder={t("booking.fuel.notesPlaceholder")}/>
          <div className="flex gap-3">
            {!customerConfirmed?(
              <button type="button" onClick={onConfirm} disabled={saving||!effectiveReady} className="flex-1 bg-[#ff7a00] py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving?t("common.loading"):!effectiveReady?t("booking.fuel.waiting"):t("booking.fuel.agreeBtn")}
              </button>
            ):(
              <button type="button" onClick={onUnconfirm} disabled={saving} className="flex-1 bg-[#f0f0f0] py-4 text-sm font-black text-black hover:bg-[#e8e8e8] disabled:opacity-50">{saving?t("common.loading"):t("booking.fuel.dispute")}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type ReviewItem = { id:string;rating:number;comment:string|null;partner_reply:string|null;partner_replied_at:string|null;created_at:string };

function BidCard({ bid,requestStatus,acceptingId,expired,onAccept }: { bid:BidRow;requestStatus:string;acceptingId:string|null;expired:boolean;onAccept:(id:string)=>void }) {
  const [showReviews,setShowReviews] = useState(false);
  const [reviews,setReviews]         = useState<ReviewItem[]>([]);
  const [loadingRevs,setLoadingRevs] = useState(false);
  const { t } = useTranslation();
  async function toggleReviews() {
    if (showReviews) { setShowReviews(false); return; }
    setShowReviews(true); if (reviews.length>0) return;
    setLoadingRevs(true);
    try { const r=await fetch(`/api/test-booking/reviews?partner_user_id=${bid.partner_user_id}`); const j=await r.json().catch(()=>null); setReviews(j?.reviews||[]); } catch { setReviews([]); }
    finally { setLoadingRevs(false); }
  }
  const curr = bid.currency ?? "EUR";
  const fmt2 = (n: number) => fmtCurr(n, curr);
  const reviewLabel = showReviews
    ? t("booking.review.hideReviews")
    : bid.review_count === 1
    ? t("booking.review.readReviews", { count: String(bid.review_count) })
    : t("booking.review.readReviews.plural", { count: String(bid.review_count) });
  return (
    <div className="bg-[#f0f0f0] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-black text-black">{bid.partner_company_name||"Car Hire Company"}</h3>
          {bid.avg_rating!=null?(
            <div className="flex items-center gap-2 flex-wrap">
              <span>{[1,2,3,4,5].map(n=><span key={n} className={n<=Math.round(bid.avg_rating!)?"text-amber-400":"text-black/10"}>★</span>)}</span>
              <span className="text-amber-600 font-black text-sm">{bid.avg_rating.toFixed(1)}</span>
              <button type="button" onClick={toggleReviews} className="text-sm font-bold text-black underline hover:opacity-70">{reviewLabel}</button>
            </div>
          ):<p className="text-xs font-semibold text-black/40">{t("booking.bids.noReviews")}</p>}
          {showReviews&&(
            <div className="bg-white p-4 space-y-4">
              {loadingRevs?<p className="text-sm text-black/40">{t("common.loading")}</p>:reviews.length===0?<p className="text-sm text-black/40">{t("booking.review.noReviewsToShow")}</p>:reviews.map(r=>(
                <div key={r.id} className="border-b border-black/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1"><span>{[1,2,3,4,5].map(n=><span key={n} className={n<=r.rating?"text-amber-400":"text-black/10"}>★</span>)}</span><span className="text-xs text-black/30">{fmt(r.created_at)}</span></div>
                  {r.comment?<p className="text-sm font-semibold text-black">{r.comment}</p>:<p className="text-xs italic text-black/30">{t("booking.review.noComment")}</p>}
                  {r.partner_reply&&<div className="mt-2 bg-[#f0f0f0] px-3 py-2"><p className="text-xs font-black text-black">{t("booking.review.partnerReply")}</p><p className="text-xs font-semibold text-black/70 mt-0.5">{r.partner_reply}</p></div>}
                </div>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.phone")}:</span> {bid.partner_phone||"—"}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.vehicle")}:</span> {bid.vehicle_category_name}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.carHire")}:</span> {fmt2(bid.car_hire_price)}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.fuelDeposit")}:</span> {fmt2(bid.fuel_price)}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.total")}:</span> {fmt2(bid.total_price)}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.insuranceIncluded")}:</span> {bid.full_insurance_included?t("common.yes"):t("common.no")}</p>
          {bid.mileage_limit&&<div className="border border-black/10 bg-white px-4 py-3 mt-2"><p className="text-sm font-black text-black mb-0.5">{t("booking.bids.mileageLimit")}</p><p className="text-sm font-semibold text-black/70">{bid.mileage_limit}</p><p className="text-xs font-semibold text-black/40 mt-1">{t("booking.bids.mileageNote")}</p></div>}
          {bid.security_deposit_notes&&<div className="border border-amber-200 bg-amber-50 px-4 py-3 mt-2"><p className="text-sm font-black text-amber-800 mb-0.5">{t("booking.bids.securityDeposit")}</p><p className="text-sm font-semibold text-amber-700">{bid.security_deposit_notes}</p><p className="text-xs font-semibold text-amber-600 mt-1">{t("booking.bids.securityNote")}</p></div>}
          {bid.notes&&<p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.bids.notes")}:</span> {bid.notes}</p>}
        </div>
        <div className="shrink-0">
          {bid.status==="accepted"?(
            <span className="bg-green-100 px-4 py-2 text-sm font-black text-green-800">{t("booking.bids.accepted.badge")}</span>
          ):requestStatus==="confirmed"?(
            <span className="bg-[#f0f0f0] px-4 py-2 text-sm font-black text-black/40">{t("booking.bids.closed")}</span>
          ):(
            <button type="button" onClick={()=>onAccept(bid.id)} disabled={!!acceptingId||expired}
              className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
              {acceptingId===bid.id?t("common.loading"):t("booking.bids.acceptPay")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptDownloadButton({ bookingId, accessToken }: { bookingId: string; accessToken: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string|null>(null);
  const { t } = useTranslation();
  async function handleDownload() {
    setLoading(true); setErr(null);
    try {
      const res  = await fetch(`/api/test-booking/bookings/${bookingId}/receipt`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to get receipt");
      window.open(json.url, "_blank");
    } catch(e: any) { setErr(e?.message || "Failed to download receipt"); }
    finally { setLoading(false); }
  }
  return (
    <div>
      <button type="button" onClick={handleDownload} disabled={loading}
        className="inline-flex items-center gap-2 border border-[#ff7a00] px-5 py-2.5 text-sm font-black text-[#ff7a00] hover:bg-[#ff7a00] hover:text-white transition-colors disabled:opacity-50">
        {loading ? t("common.loading") : `⬇ ${t("booking.receipt")}`}
      </button>
      {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
    </div>
  );
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase     = useMemo(()=>createCustomerBrowserClient(),[]);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { t }        = useTranslation();

  const [requestId,        setRequestId]        = useState("");
  const [authChecked,      setAuthChecked]      = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [acceptingId,      setAcceptingId]      = useState<string|null>(null);
  const [savingConfirm,    setSavingConfirm]    = useState<ConfirmSection|"insurance"|null>(null);
  const [error,            setError]            = useState<string|null>(null);
  const [ok,               setOk]               = useState<string|null>(null);
  const [data,             setData]             = useState<ResponseShape|null>(null);
  const [timeLabel,        setTimeLabel]        = useState("—");
  const [expired,          setExpired]          = useState(false);
  const [collectionNotes,  setCollectionNotes]  = useState("");
  const [returnNotes,      setReturnNotes]      = useState("");
  const [insuranceChecked, setInsuranceChecked] = useState(false);
  const [accessToken,      setAccessToken]      = useState("");
  const [showCancel,       setShowCancel]       = useState(false);
  const [cancelReason,     setCancelReason]     = useState("");
  const [cancelling,       setCancelling]       = useState(false);

  const paymentSuccess = searchParams.get("payment") === "success";

  useEffect(()=>{ params.then(r=>setRequestId(r.id)); },[params]);

  useEffect(()=>{
    if (!requestId) return;
    supabase.auth.getUser().then(({data:{user}})=>{
      if (!user) { router.replace(`/login?next=/bookings/${requestId}`); }
      else { setAuthChecked(true); }
    });
  },[requestId,supabase,router]);

  async function getToken(): Promise<string|null> {
    const { data:{session} } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    const { data:refreshed } = await supabase.auth.refreshSession();
    return refreshed?.session?.access_token??null;
  }

  async function load(showSpinner=false) {
    if (!requestId||!authChecked) return;
    if (showSpinner) setLoading(true);
    try {
      const token = await getToken(); if (!token) return;
      setAccessToken(token);
      const res = await fetch(`/api/test-booking/requests/${requestId}`,{cache:"no-store",headers:{Authorization:`Bearer ${token}`}});
      const json = await res.json().catch(()=>null);
      if (!res.ok) { if (showSpinner) setError(json?.error||"Failed to load."); return; }
      setData(json);
      if (json.booking) { setCollectionNotes(json.booking.collection_customer_notes||""); setReturnNotes(json.booking.return_customer_notes||""); }
    } catch { if (showSpinner) setError("Failed to load."); }
    finally { if (showSpinner) setLoading(false); }
  }

  useEffect(()=>{ load(true); },[requestId,authChecked]);
  useEffect(()=>{
    if (!requestId||!authChecked) return;
    const ti=setInterval(()=>load(false),10000); return ()=>clearInterval(ti);
  },[requestId,authChecked]);

  useEffect(()=>{
    const exp=data?.request?.expires_at;
    if (!exp) { setTimeLabel("—"); setExpired(false); return; }
    const tick=()=>{ const r=getTimeRemaining(exp); setTimeLabel(r?.label||"—"); setExpired(!!r?.expired); };
    tick(); const ti=setInterval(tick,1000); return ()=>clearInterval(ti);
  },[data?.request?.expires_at]);

  async function acceptBid(bidId: string) {
    setAcceptingId(bidId); setError(null); setOk(null);
    try {
      if (requestId) sessionStorage.setItem(`request_for_bid_${bidId}`, requestId);
      router.push(`/checkout/${bidId}`);
    } catch (e: any) { setError(e?.message || "Failed to proceed to checkout."); setAcceptingId(null); }
  }

  async function saveConfirmation(section: ConfirmSection, confirmed: boolean) {
    if (!data?.booking?.id) return;
    setSavingConfirm(section); setError(null); setOk(null);
    try {
      const token=await getToken(); if (!token) throw new Error("Not signed in");
      const res=await fetch(`/api/test-booking/bookings/${data.booking.id}/update`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({section,confirmed,notes:section==="collection"?collectionNotes:returnNotes})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to save.");
      setOk(section==="collection"?"Delivery fuel confirmed.":"Collection fuel confirmed."); await load(false);
    } catch(e:any) { setError(e?.message||"Failed to save."); }
    finally { setSavingConfirm(null); }
  }

  async function saveInsuranceConfirmation(confirmed: boolean) {
    if (!data?.booking?.id) return;
    setSavingConfirm("insurance"); setError(null); setOk(null);
    try {
      const token=await getToken(); if (!token) throw new Error("Not signed in");
      const res=await fetch(`/api/test-booking/bookings/${data.booking.id}/update`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({section:"collection",insurance_only:true,insurance_confirmed:confirmed})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to save.");
      setOk(confirmed?"Insurance documents confirmed.":"Insurance confirmation removed."); await load(false);
    } catch(e:any) { setError(e?.message||"Failed to save."); }
    finally { setSavingConfirm(null); }
  }

  async function cancelBooking() {
    if (!data?.booking?.id) return;
    setCancelling(true); setError(null); setOk(null);
    try {
      const token=await getToken(); if (!token) throw new Error("Not signed in");
      const res=await fetch(`/api/test-booking/bookings/${data.booking.id}/cancel`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({reason:cancelReason})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to cancel.");
      const msg = json.within_48hrs
        ? "Booking cancelled. Fuel deposit will be refunded. Car hire fee is non-refundable (within 48hrs of pickup)."
        : "Booking cancelled. Full refund will be processed.";
      setOk(msg); setShowCancel(false); await load(false);
    } catch(e:any) { setError(e?.message||"Failed to cancel."); }
    finally { setCancelling(false); }
  }

  if (!authChecked) return null;
  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full bg-black px-6 py-16"><p className="mx-auto max-w-6xl text-white/50 font-semibold">{t("common.loading")}</p></div>
    </div>
  );
  if (!data?.request) return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full bg-black px-6 py-16"><p className="mx-auto max-w-6xl text-white/50 font-semibold">{error||"Booking not found"}</p></div>
    </div>
  );

  const bk = data.booking;
  const bkCurr: Currency = bk?.currency ?? "EUR";
  const fmt2 = (n: number) => fmtCurr(n, bkCurr);

  const effectiveCollFuel = normalizeFuel(bk?.collection_fuel_level_partner) || normalizeFuel(bk?.collection_fuel_level_driver);
  const effectiveRetFuel  = normalizeFuel(bk?.return_fuel_level_partner)     || normalizeFuel(bk?.return_fuel_level_driver);
  const collEffectiveReady = !!bk?.collection_confirmed_by_driver || !!normalizeFuel(bk?.collection_fuel_level_partner);
  const retEffectiveReady  = !!bk?.return_confirmed_by_driver     || !!normalizeFuel(bk?.return_fuel_level_partner);
  const collReadyAt = normalizeFuel(bk?.collection_fuel_level_partner) ? bk?.collection_confirmed_by_partner_at || bk?.collection_confirmed_by_driver_at : bk?.collection_confirmed_by_driver_at;
  const retReadyAt  = normalizeFuel(bk?.return_fuel_level_partner)     ? bk?.return_confirmed_by_partner_at    || bk?.return_confirmed_by_driver_at    : bk?.return_confirmed_by_driver_at;
  const collectionLocked = !!effectiveCollFuel && !!bk?.collection_confirmed_by_customer && effectiveCollFuel === normalizeFuel(bk.collection_fuel_level_customer);
  const returnLocked     = !!effectiveRetFuel  && !!bk?.return_confirmed_by_customer     && effectiveRetFuel  === normalizeFuel(bk.return_fuel_level_customer);
  const insuranceLocked  = !!bk?.insurance_docs_confirmed_by_driver&&!!bk?.insurance_docs_confirmed_by_customer;

  const req = data.request;
  const isCancelled = bk?.booking_status==="cancelled";
  const canCancel = !!bk && !isCancelled && PRE_COLLECTION.includes(bk.booking_status);
  const pickupMs   = req.pickup_at ? new Date(req.pickup_at).getTime() : null;
  const hoursUntil = pickupMs ? (pickupMs - Date.now()) : null;
  const isWithin48 = hoursUntil !== null && hoursUntil < HOURS_48 && hoursUntil > 0;
  const carHire = Number(bk?.car_hire_price||0);
  const fuel    = Number(bk?.fuel_price||0);

  const mainAge = req.driver_age;
  const isYoungMain = mainAge != null && mainAge >= 21 && mainAge <= 24;
  const addAges = (req.additional_driver_ages || "").split(",").map(a => Number(a.trim())).filter(n => !isNaN(n) && n > 0);
  const hasYoungAdditional = addAges.some(n => n >= 21 && n <= 24);
  const showYoungDriverNote = isYoungMain || hasYoungAdditional;

  function bookingStatusLabel(s?: string|null) {
    switch(String(s||"").toLowerCase()) {
      case "confirmed": case "driver_assigned": case "en_route": case "arrived": return t("booking.status.awaitingDelivery");
      case "collected": case "returned": return t("booking.status.onHire");
      case "completed": return t("booking.status.completed");
      case "cancelled": return t("booking.status.cancelled");
      default: return String(s||"—").replaceAll("_"," ");
    }
  }

  function sportEquipmentLabel(v: string|null): string {
    if (!v || v === "none") return t("sport.none");
    const key = SPORT_KEY_MAP[v];
    return key ? t(key) : v;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("bookings.title")}</p>
            <h1 className="text-4xl font-black text-white md:text-5xl">{t("booking.title")} #{req.job_number??"—"}</h1>
            <p className="mt-3 text-base font-semibold text-white/70">{t("booking.subtitle")}</p>
          </div>
          <Link href="/bookings" className="border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors self-start mt-1">← {t("bookings.title")}</Link>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-4">

          {paymentSuccess && (
            <div className="border border-green-200 bg-green-50 px-4 py-4 flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-green-600 text-white font-black text-sm">✓</span>
              <div>
                <p className="font-black text-green-800">{t("booking.payment.success")}</p>
                <p className="text-sm font-bold text-green-700">{t("booking.payment.successSub")}</p>
              </div>
            </div>
          )}

          {error&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          {ok&&<div className="border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{ok}</div>}

          {req.status==="open"&&(
            <div className={`px-4 py-3 text-sm font-bold ${expired?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>
              <span className="font-black">{t("booking.bidWindow")}:</span> {timeLabel}
            </div>
          )}

          {isCancelled && bk && <CustomerCancellationSummary bk={bk} />}

          {canCancel&&(
            <div className="border border-red-200 bg-white px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-red-700">{t("booking.cancel")}</p>
                  {isWithin48?(
                    <p className="mt-1 text-xs font-semibold text-red-500">{t("booking.cancel.within48", { amount: fmt2(carHire), fuel: fmt2(fuel) })}</p>
                  ):(
                    <p className="mt-1 text-xs font-semibold text-black/50">{t("booking.cancel.outside48", { total: fmt2(carHire+fuel) })}</p>
                  )}
                </div>
                {!showCancel&&<button type="button" onClick={()=>setShowCancel(true)} className="shrink-0 border border-red-300 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">{t("booking.cancel")}</button>}
              </div>
              {showCancel&&(
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-red-700">{t("booking.cancel.reason")}</label>
                    <textarea rows={2} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder={t("booking.cancel.reasonPlaceholder")} className="mt-1 w-full border border-red-200 bg-[#f0f0f0] px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-red-400 resize-none"/>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={cancelBooking} disabled={cancelling} className="bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{cancelling?t("common.loading"):t("booking.cancel.confirm")}</button>
                    <button type="button" onClick={()=>setShowCancel(false)} disabled={cancelling} className="border border-black/20 px-6 py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">{t("booking.cancel.keep")}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-5">{t("booking.details.heading")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [t("bookings.pickup"),                   req.pickup_address],
                [t("bookings.dropoff"),                  req.dropoff_address||"—"],
                [t("booking.details.pickupTime"),        fmt(req.pickup_at)],
                [t("booking.details.dropoffTime"),       fmt(req.dropoff_at)],
                [t("booking.details.duration"),          formatDuration(req.journey_duration_minutes)],
                [t("home.passengers"),                   req.passengers],
                [t("home.suitcases"),                    req.suitcases],
                [t("booking.details.sportEquipment"),    sportEquipmentLabel(req.sport_equipment)],
                [t("booking.details.vehicle"),           req.vehicle_category_name||"—"],
                [t("home.mainDriverAge"),                req.driver_age ?? "—"],
                [t("home.additionalDrivers"),            req.additional_drivers > 0
                  ? `${req.additional_drivers} (ages: ${req.additional_driver_ages || "—"})`
                  : t("home.additionalDrivers.none")],
                [t("booking.details.status"),            req.status],
              ].map(([l,v])=>(
                <p key={String(l)} className="text-sm font-semibold text-black"><span className="font-black">{l}:</span> {String(v)}</p>
              ))}
              {bk&&<p className="text-sm font-semibold text-black sm:col-span-2"><span className="font-black">{t("booking.details.bookingCurrency")}:</span> {bk.currency ?? "EUR"}</p>}
              {req.notes&&<p className="text-sm font-semibold text-black sm:col-span-2"><span className="font-black">{t("booking.details.notes")}:</span> {req.notes}</p>}
            </div>
          </div>

          {showYoungDriverNote && (
            <div className="border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-800 mb-1">{t("home.youngDriver.title")}</p>
              <p className="text-sm font-semibold text-amber-700">{t("home.youngDriver.body")}</p>
            </div>
          )}

          {bk&&!isCancelled&&(
            <>
              <div className="bg-white p-6 border-l-4 border-green-500">
                <p className="text-xs font-black uppercase tracking-widest text-black mb-5">{t("booking.confirmed.heading")}</p>
                <div className="grid gap-3 sm:grid-cols-2 mb-5">
                  {[
                    [t("booking.confirmed.status"),       bookingStatusLabel(bk.booking_status)],
                    [t("booking.confirmed.company"),      bk.company_name||"—"],
                    [t("booking.confirmed.companyPhone"), bk.company_phone||"—"],
                    [t("booking.confirmed.driver"),       bk.driver_name||"—"],
                    [t("booking.confirmed.driverPhone"),  bk.driver_phone||"—"],
                    [t("booking.confirmed.vehicle"),      bk.driver_vehicle||"—"],
                  ].map(([l,v])=>(
                    <p key={String(l)} className="text-sm font-semibold text-black"><span className="font-black">{l}:</span> {String(v)}</p>
                  ))}
                </div>
                <div className="bg-[#f0f0f0] p-4 space-y-2 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("booking.confirmed.priceBreakdown")}</p>
                  <div className="flex justify-between text-sm font-semibold text-black"><span>{t("booking.confirmed.carHire")}</span><span>{fmt2(Number(bk.car_hire_price||0))}</span></div>
                  <div className="flex justify-between text-sm font-semibold text-black"><span>{t("booking.confirmed.fuelDeposit")} <span className="text-black/40">{t("booking.confirmed.fuelDepositNote")}</span></span><span>{fmt2(Number(bk.fuel_price||0))}</span></div>
                  <div className="flex justify-between text-sm font-black text-black border-t border-black/10 pt-2"><span>{t("booking.confirmed.totalPaid")}</span><span>{fmt2(Number(bk.amount||0))}</span></div>
                </div>
                {(bk.mileage_limit || bk.security_deposit_notes) && (
                  <div className="bg-[#f0f0f0] p-4 space-y-2 mb-4">
                    <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("booking.confirmed.additionalTerms")}</p>
                    {bk.mileage_limit && <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.confirmed.mileageLimit")}:</span> {bk.mileage_limit}</p>}
                    {bk.security_deposit_notes && <p className="text-sm font-semibold text-black"><span className="font-black">{t("booking.confirmed.securityDeposit")}:</span> {bk.security_deposit_notes}</p>}
                    <p className="text-xs font-semibold text-black/50 pt-1">{t("booking.confirmed.additionalTermsNote")}</p>
                  </div>
                )}
                <div className="mb-4"><ReceiptDownloadButton bookingId={bk.id} accessToken={accessToken}/></div>
                <div className="bg-[#f0f0f0] p-4 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("booking.confirmed.whatToBring")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { icon:"🪪", titleKey:"booking.confirmed.bring1.title", descKey:"booking.confirmed.bring1.desc" },
                      { icon:"🛂", titleKey:"booking.confirmed.bring2.title", descKey:"booking.confirmed.bring2.desc" },
                      { icon:"📄", titleKey:"booking.confirmed.bring3.title", descKey:"booking.confirmed.bring3.desc" },
                    ].map(item=>(
                      <div key={item.titleKey} className="flex items-start gap-3 bg-white px-4 py-3">
                        <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                        <div><p className="text-sm font-black text-black">{t(item.titleKey)}</p><p className="text-xs font-semibold text-black/60 mt-0.5">{t(item.descKey)}</p></div>
                      </div>
                    ))}
                    {bk.security_deposit_notes&&(
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-3 sm:col-span-2">
                        <span className="text-xl shrink-0 mt-0.5">💳</span>
                        <div><p className="text-sm font-black text-amber-800">{t("booking.confirmed.creditCardTitle")}</p><p className="text-xs font-semibold text-amber-700 mt-0.5">{bk.security_deposit_notes} {t("booking.confirmed.creditCardNote")}</p></div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-black/50">{t("booking.confirmed.docsNote")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bk.company_phone&&<a href={`https://wa.me/${bk.company_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 px-4 py-2 text-xs font-black text-white hover:bg-green-600">{t("booking.confirmed.whatsappCompany")}</a>}
                  {bk.driver_phone&&<a href={`https://wa.me/${bk.driver_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 px-4 py-2 text-xs font-black text-white hover:bg-green-600">{t("booking.confirmed.whatsappDriver")}</a>}
                </div>
              </div>

              {bk.booking_status==="completed"&&<BookingSummaryCard bk={bk} accessToken={accessToken}/>}
              {bk.booking_status==="completed"&&<ReviewCard bookingId={bk.id} accessToken={accessToken} existingReview={bk.existing_review} onReviewSubmitted={()=>load(false)}/>}

              <InsuranceConfirmCard
                driverConfirmed={bk.insurance_docs_confirmed_by_driver} driverConfirmedAt={bk.insurance_docs_confirmed_by_driver_at}
                customerConfirmed={bk.insurance_docs_confirmed_by_customer} customerConfirmedAt={bk.insurance_docs_confirmed_by_customer_at}
                insuranceChecked={insuranceChecked} onInsuranceChange={setInsuranceChecked}
                onConfirm={()=>saveInsuranceConfirmation(true)} onUnconfirm={()=>saveInsuranceConfirmation(false)}
                saving={savingConfirm==="insurance"} locked={insuranceLocked}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <FuelConfirmCard title={t("booking.fuel.delivery")} effectiveFuel={effectiveCollFuel} effectiveReady={collEffectiveReady} effectiveReadyAt={collReadyAt??null} customerConfirmed={bk.collection_confirmed_by_customer} customerConfirmedAt={bk.collection_confirmed_by_customer_at} locked={collectionLocked} notes={collectionNotes} onNotesChange={setCollectionNotes} onConfirm={()=>saveConfirmation("collection",true)} onUnconfirm={()=>saveConfirmation("collection",false)} saving={savingConfirm==="collection"} partnerOverrideActive={!!normalizeFuel(bk.collection_fuel_level_partner)}/>
                <FuelConfirmCard title={t("booking.fuel.collection")} effectiveFuel={effectiveRetFuel} effectiveReady={retEffectiveReady} effectiveReadyAt={retReadyAt??null} customerConfirmed={bk.return_confirmed_by_customer} customerConfirmedAt={bk.return_confirmed_by_customer_at} locked={returnLocked} notes={returnNotes} onNotesChange={setReturnNotes} onConfirm={()=>saveConfirmation("return",true)} onUnconfirm={()=>saveConfirmation("return",false)} saving={savingConfirm==="return"} partnerOverrideActive={!!normalizeFuel(bk.return_fuel_level_partner)}/>
              </div>
            </>
          )}

          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-5">{bk ? t("booking.bids.accepted") : t("booking.bids.heading")}</p>
            {expired||req.status==="expired"?(
              <p className="text-sm font-semibold text-red-600">{t("booking.bids.expired")}</p>
            ):data.bids.length===0?(
              <p className="text-sm font-semibold text-black/50">{t("booking.bids.noBids")}</p>
            ):(
              <div className="space-y-3">
                {data.bids.map(bid=>(
                  <BidCard key={bid.id} bid={bid} requestStatus={req.status} acceptingId={acceptingId} expired={expired} onAccept={acceptBid}/>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
