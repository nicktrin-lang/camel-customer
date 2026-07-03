import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";
import { calculateCommission } from "@/lib/portal/calculateCommission";
import { coerceCurrency } from "@/lib/currency";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;
  const customerSupabase = createCustomerServiceRoleSupabaseClient();
  const { data, error } = await customerSupabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const bidId = String(body?.bid_id || "").trim();
    if (!bidId) return NextResponse.json({ error: "Missing bid_id" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();

    const { data: bidRow, error: bidErr } = await db
      .from("partner_bids")
      .select("*")
      .eq("id", bidId)
      .maybeSingle();

    if (bidErr) return NextResponse.json({ error: bidErr.message }, { status: 400 });
    if (!bidRow) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

    const bidCurrency = coerceCurrency(bidRow.currency);

    const requestId     = String(bidRow.request_id || "");
    const partnerUserId = String(bidRow.partner_user_id || "");
    const totalPrice    = Number(bidRow.total_price || 0);
    const fuelPrice     = Number(bidRow.fuel_price || 0);
    const carHirePrice  = Number(bidRow.car_hire_price || 0);
    const bidNotes      = String(bidRow.notes || "").trim() || null;

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select("id, customer_user_id, status, job_number, expires_at")
      .eq("id", requestId)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "Request not found for this customer" }, { status: 404 });
    if (requestRow.status !== "open") return NextResponse.json({ error: "This request is no longer open." }, { status: 400 });

    if (isExpired(requestRow.expires_at)) {
      await db.from("customer_requests").update({ status: "expired" }).eq("id", requestId).eq("status", "open");
      await db.from("request_partner_matches").update({ match_status: "expired" }).eq("request_id", requestId).eq("match_status", "open");
      await db.from("partner_bids").update({ status: "expired" }).eq("request_id", requestId).eq("status", "submitted");
      return NextResponse.json({ error: "This request has expired." }, { status: 400 });
    }

    const jobNumber = requestRow.job_number ?? null;

    // Get partner's commission rate (profile override → platform default → 20%)
    const [profileRes, platformRes] = await Promise.all([
      db.from("partner_profiles")
        .select("commission_rate")
        .eq("user_id", partnerUserId)
        .maybeSingle(),
      db.from("platform_settings")
        .select("default_commission_rate, minimum_commission_amount")
        .limit(1)
        .maybeSingle(),
    ]);

    const commissionRatePct: number =
      profileRes.data?.commission_rate ??
      platformRes.data?.default_commission_rate ??
      20;
    const minimumCommission: number =
      platformRes.data?.minimum_commission_amount ?? 10;

    const { commissionAmount, partnerPayoutAmount, rateApplied } = calculateCommission(
      carHirePrice,
      commissionRatePct,
      minimumCommission
    );

    // Mark this bid accepted, others unsuccessful
    await db.from("partner_bids").update({ status: "accepted" }).eq("id", bidId);
    await db.from("partner_bids").update({ status: "unsuccessful" }).eq("request_id", requestId).neq("id", bidId);
    await db.from("customer_requests").update({ status: "confirmed" }).eq("id", requestId);
    await db.from("request_partner_matches").update({ match_status: "accepted" }).eq("request_id", requestId).eq("partner_user_id", partnerUserId);
    await db.from("request_partner_matches").update({ match_status: "closed" }).eq("request_id", requestId).neq("partner_user_id", partnerUserId);

    // Check if booking already exists
    const { data: existingBooking } = await db
      .from("partner_bookings")
      .select("id")
      .eq("winning_bid_id", bidId)
      .maybeSingle();

    let bookingId = String(existingBooking?.id || "").trim();

    if (!bookingId) {
      const { data: insertedBooking, error: bookingErr } = await db
        .from("partner_bookings")
        .insert({
          request_id:            requestId,
          winning_bid_id:        bidId,
          partner_user_id:       partnerUserId,
          booking_status:        "confirmed",
          amount:                totalPrice,
          currency:              bidCurrency,
          car_hire_price:        carHirePrice,
          fuel_price:            fuelPrice,
          commission_rate:       rateApplied,
          commission_amount:     commissionAmount,
          partner_payout_amount: partnerPayoutAmount,
          notes:                 bidNotes,
          job_number:            jobNumber,
        })
        .select("id")
        .single();

      if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
      bookingId = String(insertedBooking?.id || "").trim();
    }

    if (bookingId) await syncBookingStatuses(bookingId);

    return NextResponse.json({ ok: true, booking_id: bookingId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}