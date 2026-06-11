import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { id } = await params;
    const db = createServiceRoleSupabaseClient();

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id, job_number, customer_user_id, pickup_address, dropoff_address,
        pickup_at, dropoff_at, journey_duration_minutes, passengers,
        suitcases, hand_luggage, sport_equipment, vehicle_category_name, notes,
        status, created_at, expires_at,
        driver_age, additional_drivers, additional_driver_ages
      `)
      .eq("id", id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const { data: bidRows, error: bidErr } = await db
      .from("partner_bids")
      .select(`
        id, partner_user_id, vehicle_category_name, car_hire_price,
        fuel_price, total_price, full_insurance_included,
        full_tank_included, notes, status, created_at, currency,
        mileage_limit, security_deposit_notes
      `)
      .eq("request_id", id)
      .order("total_price", { ascending: true });

    if (bidErr) return NextResponse.json({ error: bidErr.message }, { status: 400 });

    const partnerIds = Array.from(new Set(
      (bidRows || []).map((r: any) => String(r.partner_user_id || "")).filter(Boolean)
    ));

    let profileMap = new Map<string, any>();
    if (partnerIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select("user_id, company_name, phone")
        .in("user_id", partnerIds);
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });
      profileMap = new Map((profileRows || []).map((r: any) => [String(r.user_id), r]));
    }

    const ratingMap = new Map<string, { avg: number; count: number }>();
    if (partnerIds.length > 0) {
      const { data: ratingRows } = await db
        .from("partner_reviews")
        .select("partner_user_id, rating")
        .in("partner_user_id", partnerIds)
        .eq("is_visible", true);

      for (const pid of partnerIds) {
        const rows = (ratingRows || []).filter((r: any) => r.partner_user_id === pid);
        if (rows.length > 0) {
          const avg = rows.reduce((s: number, r: any) => s + r.rating, 0) / rows.length;
          ratingMap.set(pid, { avg: Math.round(avg * 10) / 10, count: rows.length });
        }
      }
    }

    const bids = (bidRows || []).map((bid: any) => {
      const profile = profileMap.get(String(bid.partner_user_id)) || null;
      const ratings = ratingMap.get(String(bid.partner_user_id)) || null;
      return {
        id: bid.id,
        partner_user_id: bid.partner_user_id,
        partner_company_name: profile?.company_name || "Car Hire Company",
        partner_contact_name: null,
        partner_phone: profile?.phone || null,
        partner_address: null,
        vehicle_category_name: bid.vehicle_category_name,
        car_hire_price: bid.car_hire_price,
        fuel_price: bid.fuel_price,
        total_price: bid.total_price,
        full_insurance_included: !!bid.full_insurance_included,
        full_tank_included: !!bid.full_tank_included,
        notes: bid.notes || null,
        status: bid.status,
        created_at: bid.created_at,
        currency: (bid.currency as "EUR" | "GBP") ?? "EUR",
        avg_rating: ratings?.avg ?? null,
        review_count: ratings?.count ?? 0,
        mileage_limit: bid.mileage_limit || null,
        security_deposit_notes: bid.security_deposit_notes || null,
      };
    });

    const acceptedBid = bids.find((b: any) => b.status === "accepted") || null;
    let booking: any = null;

    if (acceptedBid) {
      const { data: bookingRows, error: bookingErr } = await db
        .from("partner_bookings")
        .select(`
          id, request_id, partner_user_id, winning_bid_id,
          booking_status, amount, notes, created_at, job_number,
          assigned_driver_id, driver_name, driver_phone,
          driver_vehicle, driver_notes, driver_assigned_at,
          currency, charge_currency, fuel_price, car_hire_price,
          fuel_used_quarters, fuel_charge, fuel_refund,
          post_completion_refund_total,
          collection_confirmed_by_driver, collection_confirmed_by_driver_at, collection_fuel_level_driver,
          return_confirmed_by_driver, return_confirmed_by_driver_at, return_fuel_level_driver,
          collection_confirmed_by_partner, collection_confirmed_by_partner_at, collection_fuel_level_partner, collection_partner_notes,
          return_confirmed_by_partner, return_confirmed_by_partner_at, return_fuel_level_partner, return_partner_notes,
          collection_confirmed_by_customer, collection_confirmed_by_customer_at, collection_fuel_level_customer, collection_customer_notes,
          return_confirmed_by_customer, return_confirmed_by_customer_at, return_fuel_level_customer, return_customer_notes,
          insurance_docs_confirmed_by_driver, insurance_docs_confirmed_by_driver_at,
          insurance_docs_confirmed_by_customer, insurance_docs_confirmed_by_customer_at,
          cancelled_by, cancelled_at, cancellation_reason, refund_status
        `)
        .eq("winning_bid_id", acceptedBid.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });

      const bk = bookingRows?.[0] || null;
      if (bk) {
        const winnerProfile = profileMap.get(String(bk.partner_user_id || "")) || null;

        const { data: existingReview } = await db
          .from("partner_reviews")
          .select("id, rating, comment, partner_reply, partner_replied_at, created_at")
          .eq("booking_id", bk.id)
          .maybeSingle();

        // ── Fetch post-completion refunds ──────────────────────────────────
        const { data: refundRows } = await db
          .from("partner_booking_refunds")
          .select("id, amount, reason, stripe_refund_id, created_at")
          .eq("booking_id", bk.id)
          .order("created_at", { ascending: true });

        const postCompletionRefunds = (refundRows ?? []).map((r: any) => ({
          id:               r.id,
          amount:           Number(r.amount),
          reason:           r.reason ?? null,
          stripe_refund_id: r.stripe_refund_id ?? null,
          created_at:       r.created_at,
        }));

        booking = {
          id: bk.id,
          request_id: bk.request_id,
          partner_user_id: bk.partner_user_id,
          winning_bid_id: bk.winning_bid_id,
          booking_status: bk.booking_status,
          amount: bk.amount,
          notes: bk.notes,
          created_at: bk.created_at,
          job_number: bk.job_number,
          assigned_driver_id: bk.assigned_driver_id || null,
          company_name: winnerProfile?.company_name || acceptedBid.partner_company_name || "Car Hire Company",
          company_phone: winnerProfile?.phone || acceptedBid.partner_phone || null,
          driver_name: bk.driver_name || null,
          driver_phone: bk.driver_phone || null,
          driver_vehicle: bk.driver_vehicle || null,
          driver_notes: bk.driver_notes || null,
          driver_assigned_at: bk.driver_assigned_at || null,
          currency: (bk.currency as "EUR" | "GBP") ?? "EUR",
          charge_currency: (bk.charge_currency as "EUR" | "GBP" | "USD") ?? null,
          fuel_price: bk.fuel_price ?? 0,
          car_hire_price: bk.car_hire_price ?? 0,
          fuel_used_quarters: bk.fuel_used_quarters ?? null,
          fuel_charge: bk.fuel_charge ?? null,
          fuel_refund: bk.fuel_refund ?? null,
          post_completion_refund_total: Number(bk.post_completion_refund_total ?? 0),
          postCompletionRefunds,
          collection_confirmed_by_driver: !!bk.collection_confirmed_by_driver,
          collection_confirmed_by_driver_at: bk.collection_confirmed_by_driver_at || null,
          collection_fuel_level_driver: bk.collection_fuel_level_driver || null,
          return_confirmed_by_driver: !!bk.return_confirmed_by_driver,
          return_confirmed_by_driver_at: bk.return_confirmed_by_driver_at || null,
          return_fuel_level_driver: bk.return_fuel_level_driver || null,
          collection_confirmed_by_partner: !!bk.collection_confirmed_by_partner,
          collection_confirmed_by_partner_at: bk.collection_confirmed_by_partner_at || null,
          collection_fuel_level_partner: bk.collection_fuel_level_partner || null,
          collection_partner_notes: bk.collection_partner_notes || null,
          return_confirmed_by_partner: !!bk.return_confirmed_by_partner,
          return_confirmed_by_partner_at: bk.return_confirmed_by_partner_at || null,
          return_fuel_level_partner: bk.return_fuel_level_partner || null,
          return_partner_notes: bk.return_partner_notes || null,
          collection_confirmed_by_customer: !!bk.collection_confirmed_by_customer,
          collection_confirmed_by_customer_at: bk.collection_confirmed_by_customer_at || null,
          collection_fuel_level_customer: bk.collection_fuel_level_customer || null,
          collection_customer_notes: bk.collection_customer_notes || null,
          return_confirmed_by_customer: !!bk.return_confirmed_by_customer,
          return_confirmed_by_customer_at: bk.return_confirmed_by_customer_at || null,
          return_fuel_level_customer: bk.return_fuel_level_customer || null,
          return_customer_notes: bk.return_customer_notes || null,
          insurance_docs_confirmed_by_driver: !!bk.insurance_docs_confirmed_by_driver,
          insurance_docs_confirmed_by_driver_at: bk.insurance_docs_confirmed_by_driver_at || null,
          insurance_docs_confirmed_by_customer: !!bk.insurance_docs_confirmed_by_customer,
          insurance_docs_confirmed_by_customer_at: bk.insurance_docs_confirmed_by_customer_at || null,
          cancelled_by: bk.cancelled_by || null,
          cancelled_at: bk.cancelled_at || null,
          cancellation_reason: bk.cancellation_reason || null,
          refund_status: bk.refund_status || null,
          has_review: !!existingReview,
          existing_review: existingReview || null,
          mileage_limit: acceptedBid.mileage_limit || null,
          security_deposit_notes: acceptedBid.security_deposit_notes || null,
        };
      }
    }

    return NextResponse.json({ request: requestRow, bids, booking }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
