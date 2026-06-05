"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Currency = "EUR" | "GBP" | "USD";

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
  mileage_limit: string|null;
  security_deposit_amount: number|null;
  security_deposit_notes: string|null;
};
type ResponseShape = { request: RequestData; bids: BidRow[]; booking: BookingData|null };
type ConfirmSection = "collection"|"return";

const HOURS_48 = 48*60*60*1000;
const PRE_COLLECTION = ["confirmed","driver_assigned","en_route","arrived"];

function normalizeFuel(v: unknown): string|null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s==="empty") return "empty"; if (s==="quarter") return "quarter";
  if (s==="half") return "half"; if (s==="three_quarter"||s==="3/4") return "3/4";
  if (s==="full") return "full"; return null;
}
function fuelLabel(v: unknown): string {
  switch(normalizeFuel(v)) {
    case "empty": return "Empty"; case "quarter": return "¼ Tank";
    case "half": return "½ Tank"; case "3/4": return "¾ Tank";
    case "full": return "Full Tank"; default: return "—";
  }
}
const FUEL_BARS_MAP: Record<string,number> = { empty:0, quarter:1, half:2, "3/4":3, full:4 };
const QUARTER_LABELS: Record<number,string> = { 0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank" };

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

const LOCALE_MAP: Record<Currency,string> = { EUR:"es-ES", GBP:"en-GB", USD:"en-US" };
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
function bookingStatusLabel(s?: string|null) {
  switch(String(s||"").toLowerCase()) {
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Awaiting delivery";
    case "collected": case "returned": return "On Hire";
    case "completed": return "Completed"; case "cancelled": return "Cancelled";
    default: return String(s||"—").replaceAll("_"," ");
  }
}
function sportEquipmentLabel(v: string|null): string {
  if (!v||v==="none") return "None";
  const map: Record<string,string> = {
    golf_single:"Golf clubs — 1 bag", golf_two:"Golf clubs — 2 bags", golf_three:"Golf clubs — 3 bags", golf_four:"Golf clubs — 4+ bags",
    skis_pair:"Skis / snowboard — 1 set", skis_two:"Skis / snowboard — 2 sets", skis_three:"Skis / snowboard — 3+ sets",
    bikes_one:"Bikes — 1", bikes_two:"Bikes — 2", bikes_three:"Bikes — 3+", other:"Other large equipment",
  };
  return map[v]||v;
}

function CustomerCancellationSummary({ bk }: { bk: BookingData }) {
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
  const cancelledByLabel = bk.cancelled_by === "partner" ? "The car hire company" : bk.cancelled_by === "admin" ? "Camel Global" : "You";
  return (
    <div className="border border-red-200 bg-red-50 px-6 py-5 space-y-5">
      <div>
        <p className="text-base font-black text-red-800">❌ This booking has been cancelled</p>
        <p className="text-sm font-semibold text-red-600 mt-1">Cancelled by: <strong>{cancelledByLabel}</strong> on {fmt(bk.cancelled_at)}</p>
        {bk.cancellation_reason && <p className="text-sm font-semibold text-red-600">Reason: {bk.cancellation_reason}</p>}
      </div>
      <div className={`px-4 py-3 text-sm font-semibold border ${within48?"bg-amber-50 border-amber-300 text-amber-800":"bg-green-50 border-green-300 text-green-800"}`}>
        {within48?"⚠ This cancellation was made within 48 hours of your pickup time. Under our cancellation policy, the car hire fee is non-refundable. However, your full fuel deposit will be returned.":"✅ This cancellation was made more than 48 hours before your pickup time. You are entitled to a full refund of everything you paid."}
      </div>
      <div className="bg-white border border-red-100 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">What You Paid</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Car hire</span><span className="font-black text-black">{fmtCurr(carHire,curr)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Full tank deposit</span><span className="font-black text-black">{fmtCurr(fuel,curr)}</span></div>
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black/60">Total paid</span><span className="text-black">{fmtCurr(total,curr)}</span></div>
        </div>
      </div>
      <div className="bg-white border border-red-100 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">Your Refund</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Car hire refund</span><span className={`font-black ${carHireRefund>0?"text-green-700":"text-red-500"}`}>{carHireRefund>0?fmtCurr(carHireRefund,curr):"Not refunded — within 48hrs of pickup"}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Fuel deposit refund</span><span className="font-black text-green-700">{fmtCurr(fuelRefund,curr)}</span></div>
          {nonRefundable>0&&<div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Non-refundable amount</span><span className="font-black text-red-600">{fmtCurr(nonRefundable,curr)}</span></div>}
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black">Total refund to you</span><span className="text-green-700 text-base">{fmtCurr(totalRefund,curr)}</span></div>
        </div>
      </div>
      <p className="text-xs font-semibold text-black/50">Refunds are processed automatically and will appear in your account within 5–10 working days depending on your bank.</p>
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
          <p className="text-xs font-black uppercase tracking-widest text-white/50">Booking Summary</p>
          <span className="bg-green-400 px-3 py-1 text-xs font-black text-green-900">Finalised</span>
        </div>
        <div className="bg-white/10 p-4 mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">Total booking value</p>
          <p className="text-3xl font-black text-white">{fmt2(totalAmt)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black text-white/50 uppercase tracking-wide">Car hire</p><p className="font-bold text-white">{fmt2(carHireAmt)}</p></div>
            <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black text-white/50 uppercase tracking-wide">Full tank deposit</p><p className="font-bold text-white">{fmt2(fullTankAmt)}</p></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          {[{label:"Delivery fuel",value:fuelLabel(collFuel),bar:collFuel},{label:"Collection fuel",value:fuelLabel(retFuel),bar:retFuel},{label:"Fuel used",value:usedQ!==null?QUARTER_LABELS[usedQ]??`${usedQ}/4`:"—",bar:null},{label:"Per quarter",value:fmt2(perQtrAmt),bar:null}].map(({label,value,bar})=>(
            <div key={label} className="bg-white/10 p-3"><p className="text-xs font-black text-white/50 uppercase tracking-wide mb-1">{label}</p><p className="font-black text-white">{value}</p>{bar&&<FuelBar level={bar} light/>}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#ff7a00]/20 border border-[#ff7a00]/40 p-4"><p className="text-xs font-black text-white/70 uppercase tracking-wide mb-2">Fuel charge to you</p><p className="text-2xl font-black text-white">{fuelCharge!=null?fmt2(fuelCharge):"—"}</p></div>
          <div className="bg-green-500/20 border border-green-400/40 p-4"><p className="text-xs font-black text-white/70 uppercase tracking-wide mb-2">Refund to you</p><p className="text-2xl font-black text-white">{fuelRefund!=null?fmt2(fuelRefund):"—"}</p></div>
        </div>
      </div>
      <div className="bg-white p-6">
        <p className="text-xs font-black uppercase tracking-widest text-black mb-4">Booking Documents</p>
        <CompletionStatementButton bookingId={bk.id} accessToken={accessToken} />
      </div>
    </>
  );
}

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

function ReviewCard({ bookingId, accessToken, existingReview, onReviewSubmitted }: { bookingId:string; accessToken:string; existingReview:ExistingReview|null; onReviewSubmitted:()=>void }) {
  const [rating,setRating]       = useState(existingReview?.rating??0);
  const [comment,setComment]     = useState(existingReview?.comment??"");
  const [saving,setSaving]       = useState(false);
  const [error,setError]         = useState<string|null>(null);
  const [submitted,setSubmitted] = useState(!!existingReview);
  const { t } = useTranslation();
  async function submit() {
    if (!rating) { setError("Please select a star rating."); return; }
    if (comment&&containsBadWords(comment)) { setError("Your review contains language that is not permitted."); return; }
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
      <p className="text-sm font-semibold text-black/50 mb-4">{submitted ? t("booking.review.thanks") : "How was your experience?"}</p>
      {submitted?(
        <>
          <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(n=><span key={n} className={`text-2xl ${n<=rating?"text-amber-400":"text-black/10"}`}>★</span>)}</div>
          {comment&&<p className="text-base font-semibold text-black">{comment}</p>}
          {existingReview?.partner_reply&&(
            <div className="mt-4 bg-[#f0f0f0] px-4 py-3"><p className="text-xs font-black uppercase tracking-widest text-black mb-1">Partner reply · {fmt(existingReview.partner_replied_at)}</p><p className="text-sm font-semibold text-black">{existingReview.partner_reply}</p></div>
          )}
        </>
      ):(
        <>
          <div className="mb-4"><StarPicker value={rating} onChange={setRating}/></div>
          <textarea rows={3} value={comment} onChange={e=>setComment(e.target.value)} className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] placeholder:text-black/30 resize-none mb-3" placeholder="Tell us about your experience…"/>
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
      <p className="text-xs font-black uppercase tracking-widest text-black mb-1">📄 Insurance Documents</p>
      <p className="text-sm font-semibold text-black/50 mb-4">The driver must hand you the insurance paperwork at delivery.</p>
      <div className={`px-4 py-3 mb-4 ${driverConfirmed?"bg-black":"bg-[#f0f0f0]"}`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${driverConfirmed?"text-white":"text-black/50"}`}>Driver confirmed handover</p>
        {driverConfirmed?<><p className="text-base font-black text-white">✓ Driver confirmed</p><p className="text-xs text-white/70">{fmt(driverConfirmedAt)}</p></>:<p className="text-sm font-semibold text-black/40">Waiting for driver…</p>}
      </div>
      {locked?(
        <div className="bg-green-100 px-4 py-3 text-sm font-black text-green-800">✓ Both you and the driver have confirmed insurance documents were handed over.</div>
      ):(
        <>
          {customerConfirmed&&<div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black mb-4">You confirmed receipt at {fmt(customerConfirmedAt)}</div>}
          {!customerConfirmed&&(
            <label className={`flex items-start gap-3 p-3 cursor-pointer mb-4 border-2 transition ${insuranceChecked?"border-green-400 bg-green-50":"border-black/10 bg-[#f0f0f0]"}`}>
              <input type="checkbox" checked={insuranceChecked} onChange={e=>onInsuranceChange(e.target.checked)} disabled={!driverConfirmed||saving} className="mt-0.5 h-5 w-5 shrink-0"/>
              <p className="text-sm font-bold text-black">I confirm I have received the insurance documents</p>
            </label>
          )}
          <div className="flex gap-3">
            {!customerConfirmed?(
              <button type="button" onClick={onConfirm} disabled={saving||!driverConfirmed||!insuranceChecked} className="flex-1 bg-[#ff7a00] py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving?t("common.loading"):!driverConfirmed?"Waiting for driver…":!insuranceChecked?"Tick box above to confirm":"✓ Confirm receipt of documents"}
              </button>
            ):(
              <button type="button" onClick={onUnconfirm} disabled={saving} className="flex-1 bg-[#f0f0f0] py-4 text-sm font-black text-black hover:bg-[#e8e8e8] disabled:opacity-50">{saving?t("common.loading"):"Dispute / I did not receive them"}</button>
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
          {partnerOverrideActive?"Office recorded":"Driver recorded"}
        </p>
        {effectiveReady&&effectiveFuel
          ? <><p className="text-2xl font-black text-white">{fuelLabel(effectiveFuel)}</p><FuelBar level={effectiveFuel} light/>{partnerOverrideActive&&<p className="text-xs text-[#ff7a00] mt-1 font-black">⚠ Office override in effect</p>}<p className="text-xs text-white/70 mt-1">{fmt(effectiveReadyAt)}</p></>
          : <p className="text-sm font-semibold text-black/40">Waiting for driver…</p>}
      </div>
      {locked?(
        <div className="bg-green-100 px-4 py-3 text-sm font-black text-green-800">✓ Confirmed — you and the {partnerOverrideActive?"office":"driver"} agree on {fuelLabel(effectiveFuel)}</div>
      ):(
        <>
          {customerConfirmed&&<div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black mb-4">You confirmed this at {fmt(customerConfirmedAt)}</div>}
          <textarea rows={3} value={notes} onChange={e=>onNotesChange(e.target.value)} disabled={locked} className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] disabled:opacity-50 resize-none mb-4" placeholder="Any notes…"/>
          <div className="flex gap-3">
            {!customerConfirmed?(
              <button type="button" onClick={onConfirm} disabled={saving||!effectiveReady} className="flex-1 bg-[#ff7a00] py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving?t("common.loading"):!effectiveReady?"Waiting for driver…":"✓ I agree with this fuel level"}
              </button>
            ):(
              <button type="button" onClick={onUnconfirm} disabled={saving} className="flex-1 bg-[#f0f0f0] py-4 text-sm font-black text-black hover:bg-[#e8e8e8] disabled:opacity-50">{saving?t("common.loading"):"Dispute / Change"}</button>
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
  return (
    <div className="bg-[#f0f0f0] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-black text-black">{bid.partner_company_name||"Car Hire Company"}</h3>
          {bid.avg_rating!=null?(
            <div className="flex items-center gap-2 flex-wrap">
              <span>{[1,2,3,4,5].map(n=><span key={n} className={n<=Math.round(bid.avg_rating!)?"text-amber-400":"text-black/10"}>★</span>)}</span>
              <span className="text-amber-600 font-black text-sm">{bid.avg_rating.toFixed(1)}</span>
              <button type="button" onClick={toggleReviews} className="text-sm font-bold text-black underline hover:opacity-70">{showReviews?"Hide reviews":`Read ${bid.review_count} review${bid.review_count!==1?"s":""}`}</button>
            </div>
          ):<p className="text-xs font-semibold text-black/40">No reviews yet</p>}
          {showReviews&&(
            <div className="bg-white p-4 space-y-4">
              {loadingRevs?<p className="text-sm text-black/40">{t("common.loading")}</p>:reviews.length===0?<p className="text-sm text-black/40">No reviews to show.</p>:reviews.map(r=>(
                <div key={r.id} className="border-b border-black/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1"><span>{[1,2,3,4,5].map(n=><span key={n} className={n<=r.rating?"text-amber-400":"text-black/10"}>★</span>)}</span><span className="text-xs text-black/30">{fmt(r.created_at)}</span></div>
                  {r.comment?<p className="text-sm font-semibold text-black">{r.comment}</p>:<p className="text-xs italic text-black/30">No written comment.</p>}
                  {r.partner_reply&&<div className="mt-2 bg-[#f0f0f0] px-3 py-2"><p className="text-xs font-black text-black">Partner reply</p><p className="text-xs font-semibold text-black/70 mt-0.5">{r.partner_reply}</p></div>}
                </div>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-black"><span className="font-black">Phone:</span> {bid.partner_phone||"—"}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Vehicle:</span> {bid.vehicle_category_name}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Car hire:</span> {fmt2(bid.car_hire_price)}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Fuel deposit:</span> {fmt2(bid.fuel_price)}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Total:</span> {fmt2(bid.total_price)}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Insurance included:</span> {bid.full_insurance_included?"Yes":"No"}</p>
          {bid.mileage_limit&&<div className="border border-black/10 bg-white px-4 py-3 mt-2"><p className="text-sm font-black text-black mb-0.5">📏 Mileage limit</p><p className="text-sm font-semibold text-black/70">{bid.mileage_limit}</p><p className="text-xs font-semibold text-black/40 mt-1">Any excess mileage charges are payable directly to the car hire company at collection — credit card required.</p></div>}
          {bid.security_deposit_notes&&<div className="border border-amber-200 bg-amber-50 px-4 py-3 mt-2"><p className="text-sm font-black text-amber-800 mb-0.5">💳 Security deposit required</p><p className="text-sm font-semibold text-amber-700">{bid.security_deposit_notes}</p><p className="text-xs font-semibold text-amber-600 mt-1">Payable directly to the car hire company at collection. Credit card only — debit cards cannot be used for deposit blocking.</p></div>}
          {bid.notes&&<p className="text-sm font-semibold text-black"><span className="font-black">Notes:</span> {bid.notes}</p>}
        </div>
        <div className="shrink-0">
          {bid.status==="accepted"?(
            <span className="bg-green-100 px-4 py-2 text-sm font-black text-green-800">Accepted ✓</span>
          ):requestStatus==="confirmed"?(
            <span className="bg-[#f0f0f0] px-4 py-2 text-sm font-black text-black/40">Closed</span>
          ):(
            <button type="button" onClick={()=>onAccept(bid.id)} disabled={!!acceptingId||expired}
              className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
              {acceptingId===bid.id?t("common.loading"):"Accept & Pay →"}
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
    const t=setInterval(()=>load(false),10000); return ()=>clearInterval(t);
  },[requestId,authChecked]);

  useEffect(()=>{
    const exp=data?.request?.expires_at;
    if (!exp) { setTimeLabel("—"); setExpired(false); return; }
    const tick=()=>{ const r=getTimeRemaining(exp); setTimeLabel(r?.label||"—"); setExpired(!!r?.expired); };
    tick(); const t=setInterval(tick,1000); return ()=>clearInterval(t);
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("bookings.title")}</p>
            <h1 className="text-4xl font-black text-white md:text-5xl">{t("booking.title")} #{req.job_number??"—"}</h1>
            <p className="mt-3 text-base font-semibold text-white/70">Review your booking and any bids received.</p>
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
                <p className="font-black text-green-800">Payment successful — your booking is confirmed!</p>
                <p className="text-sm font-bold text-green-700">You will receive a confirmation email and receipt shortly. The car hire company has been notified.</p>
              </div>
            </div>
          )}

          {error&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          {ok&&<div className="border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{ok}</div>}

          {req.status==="open"&&(
            <div className={`px-4 py-3 text-sm font-bold ${expired?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>
              <span className="font-black">Bid window:</span> {timeLabel}
            </div>
          )}

          {isCancelled && bk && <CustomerCancellationSummary bk={bk} />}

          {canCancel&&(
            <div className="border border-red-200 bg-white px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-red-700">{t("booking.cancel")}</p>
                  {isWithin48?(
                    <p className="mt-1 text-xs font-semibold text-red-500">⚠ Your pickup is within 48 hours. If you cancel now, the car hire fee of {fmt2(carHire)} is non-refundable. Your fuel deposit of {fmt2(fuel)} will be refunded.</p>
                  ):(
                    <p className="mt-1 text-xs font-semibold text-black/50">More than 48 hours before pickup — you will receive a full refund of {fmt2(carHire+fuel)}.</p>
                  )}
                </div>
                {!showCancel&&<button type="button" onClick={()=>setShowCancel(true)} className="shrink-0 border border-red-300 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">{t("booking.cancel")}</button>}
              </div>
              {showCancel&&(
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-red-700">Reason (optional)</label>
                    <textarea rows={2} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Tell us why you're cancelling…" className="mt-1 w-full border border-red-200 bg-[#f0f0f0] px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-red-400 resize-none"/>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={cancelBooking} disabled={cancelling} className="bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{cancelling?t("common.loading"):"Confirm Cancellation"}</button>
                    <button type="button" onClick={()=>setShowCancel(false)} disabled={cancelling} className="border border-black/20 px-6 py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">Keep Booking</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-5">Booking Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [t("bookings.pickup"),      req.pickup_address],
                [t("bookings.dropoff"),     req.dropoff_address||"—"],
                ["Pickup time",             fmt(req.pickup_at)],
                ["Drop-off time",           fmt(req.dropoff_at)],
                ["Duration",                formatDuration(req.journey_duration_minutes)],
                [t("home.passengers"),      req.passengers],
                [t("home.suitcases"),       req.suitcases],
                ["Sport equipment",         sportEquipmentLabel(req.sport_equipment)],
                ["Vehicle",                 req.vehicle_category_name||"—"],
                [t("home.mainDriverAge"),   req.driver_age ?? "—"],
                [t("home.additionalDrivers"), req.additional_drivers > 0
                  ? `${req.additional_drivers} (ages: ${req.additional_driver_ages || "—"})`
                  : t("home.additionalDrivers.none")],
                ["Status", req.status],
              ].map(([l,v])=>(
                <p key={String(l)} className="text-sm font-semibold text-black"><span className="font-black">{l}:</span> {String(v)}</p>
              ))}
              {bk&&<p className="text-sm font-semibold text-black sm:col-span-2"><span className="font-black">Booking currency:</span> {bk.currency ?? "EUR"}</p>}
              {req.notes&&<p className="text-sm font-semibold text-black sm:col-span-2"><span className="font-black">Notes:</span> {req.notes}</p>}
            </div>
          </div>

          {showYoungDriverNote && (
            <div className="border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-800 mb-1">{t("home.youngDriver.title")}</p>
              <p className="text-sm font-semibold text-amber-700">One or more drivers on this booking are aged 21–24. Car hire companies may include a young driver surcharge in their bid price.</p>
            </div>
          )}

          {bk&&!isCancelled&&(
            <>
              <div className="bg-white p-6 border-l-4 border-green-500">
                <p className="text-xs font-black uppercase tracking-widest text-black mb-5">Your Confirmed Booking</p>
                <div className="grid gap-3 sm:grid-cols-2 mb-5">
                  {[
                    ["Status",           bookingStatusLabel(bk.booking_status)],
                    ["Car hire company", bk.company_name||"—"],
                    ["Company phone",    bk.company_phone||"—"],
                    ["Driver",           bk.driver_name||"—"],
                    ["Driver phone",     bk.driver_phone||"—"],
                    ["Vehicle",          bk.driver_vehicle||"—"],
                  ].map(([l,v])=>(
                    <p key={String(l)} className="text-sm font-semibold text-black"><span className="font-black">{l}:</span> {String(v)}</p>
                  ))}
                </div>
                <div className="bg-[#f0f0f0] p-4 space-y-2 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Price Breakdown</p>
                  <div className="flex justify-between text-sm font-semibold text-black"><span>Car hire</span><span>{fmt2(Number(bk.car_hire_price||0))}</span></div>
                  <div className="flex justify-between text-sm font-semibold text-black"><span>Full tank deposit <span className="text-black/40">(refundable)</span></span><span>{fmt2(Number(bk.fuel_price||0))}</span></div>
                  <div className="flex justify-between text-sm font-black text-black border-t border-black/10 pt-2"><span>Total paid</span><span>{fmt2(Number(bk.amount||0))}</span></div>
                </div>
                {(bk.mileage_limit || bk.security_deposit_notes) && (
                  <div className="bg-[#f0f0f0] p-4 space-y-2 mb-4">
                    <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Additional Terms</p>
                    {bk.mileage_limit && <p className="text-sm font-semibold text-black"><span className="font-black">Mileage limit:</span> {bk.mileage_limit}</p>}
                    {bk.security_deposit_notes && <p className="text-sm font-semibold text-black"><span className="font-black">Security deposit:</span> {bk.security_deposit_notes}</p>}
                    <p className="text-xs font-semibold text-black/50 pt-1">These are arrangements between you and the car hire company, payable directly at collection. Credit card only.</p>
                  </div>
                )}
                <div className="mb-4"><ReceiptDownloadButton bookingId={bk.id} accessToken={accessToken}/></div>
                <div className="bg-[#f0f0f0] p-4 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-3">📋 What to bring when collecting your car</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { icon:"🪪", title:"Driving licence — all drivers", desc:"Full EU licence in Roman alphabet. If your licence does not meet this, bring an international driving permit alongside your original." },
                      { icon:"🛂", title:"Passport or national ID — all drivers", desc:"A valid passport or national identity document for every driver on this booking." },
                      { icon:"📄", title:"Photocopies recommended", desc:"Bring a photocopy of your driving licence and passport for all drivers. Some companies require these for their records." },
                    ].map(item=>(
                      <div key={item.title} className="flex items-start gap-3 bg-white px-4 py-3">
                        <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                        <div><p className="text-sm font-black text-black">{item.title}</p><p className="text-xs font-semibold text-black/60 mt-0.5">{item.desc}</p></div>
                      </div>
                    ))}
                    {bk.security_deposit_notes&&(
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-3 sm:col-span-2">
                        <span className="text-xl shrink-0 mt-0.5">💳</span>
                        <div><p className="text-sm font-black text-amber-800">Credit card required at collection</p><p className="text-xs font-semibold text-amber-700 mt-0.5">{bk.security_deposit_notes} Credit card only — debit cards cannot be used for deposit blocking.</p></div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-black/50">All documents must be originals — digital copies and mobile photos are not accepted.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bk.company_phone&&<a href={`https://wa.me/${bk.company_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 px-4 py-2 text-xs font-black text-white hover:bg-green-600">💬 WhatsApp Car Hire Company</a>}
                  {bk.driver_phone&&<a href={`https://wa.me/${bk.driver_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 px-4 py-2 text-xs font-black text-white hover:bg-green-600">💬 WhatsApp Driver</a>}
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
                <FuelConfirmCard title="Delivery Fuel" effectiveFuel={effectiveCollFuel} effectiveReady={collEffectiveReady} effectiveReadyAt={collReadyAt??null} customerConfirmed={bk.collection_confirmed_by_customer} customerConfirmedAt={bk.collection_confirmed_by_customer_at} locked={collectionLocked} notes={collectionNotes} onNotesChange={setCollectionNotes} onConfirm={()=>saveConfirmation("collection",true)} onUnconfirm={()=>saveConfirmation("collection",false)} saving={savingConfirm==="collection"} partnerOverrideActive={!!normalizeFuel(bk.collection_fuel_level_partner)}/>
                <FuelConfirmCard title="Collection Fuel" effectiveFuel={effectiveRetFuel} effectiveReady={retEffectiveReady} effectiveReadyAt={retReadyAt??null} customerConfirmed={bk.return_confirmed_by_customer} customerConfirmedAt={bk.return_confirmed_by_customer_at} locked={returnLocked} notes={returnNotes} onNotesChange={setReturnNotes} onConfirm={()=>saveConfirmation("return",true)} onUnconfirm={()=>saveConfirmation("return",false)} saving={savingConfirm==="return"} partnerOverrideActive={!!normalizeFuel(bk.return_fuel_level_partner)}/>
              </div>
            </>
          )}

          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-5">{bk?"Accepted Bid":"Car Hire Company Bids"}</p>
            {expired||req.status==="expired"?(
              <p className="text-sm font-semibold text-red-600">This request has expired.</p>
            ):data.bids.length===0?(
              <p className="text-sm font-semibold text-black/50">No bids yet — car hire companies in your area will be notified shortly.</p>
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