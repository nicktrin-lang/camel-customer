import { NextRequest, NextResponse } from "next/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { generateCompletionStatementPDF } from "@/lib/portal/generateCompletionStatementPDF";

const BUCKET            = "booking-receipts";
const SIGNED_URL_EXPIRY = 60;

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function normalizeFuel(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s === "empty")   return "empty";
  if (s === "quarter") return "quarter";
  if (s === "half")    return "half";
  if (s === "three_quarter" || s === "3/4") return "3/4";
  if (s === "full")    return "full";
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorised — no token" }, { status: 401 });

  const db         = createCustomerServiceRoleSupabaseClient();
  const portalDb   = createServiceRoleSupabaseClient();

  const { data: authData, error: authErr } = await db.auth.getUser(token);
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Unauthorised — bad token" }, { status: 401 });
  }
  const user = authData.user;

  const { data: bk, error: bkErr } = await db
    .from("partner_bookings")
    .select(`
      id, request_id, partner_user_id, job_number,
      booking_status, currency,
      car_hire_price, fuel_price, amount,
      fuel_used_quarters, fuel_charge, fuel_refund,
      post_completion_refund_total,
      collection_fuel_level_partner, collection_fuel_level_driver,
      return_fuel_level_partner, return_fuel_level_driver
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 500 });
  if (!bk)   return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (bk.booking_status !== "completed") {
    return NextResponse.json({ error: "Completion statement only available for completed bookings" }, { status: 400 });
  }

  const { data: cr, error: crErr } = await db
    .from("customer_requests")
    .select("id, customer_user_id, pickup_address, dropoff_address, pickup_at, dropoff_at, journey_duration_minutes, vehicle_category_name")
    .eq("id", bk.request_id)
    .maybeSingle();

  if (crErr) return NextResponse.json({ error: crErr.message }, { status: 500 });
  if (!cr)   return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (cr.customer_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profile } = await db
    .from("partner_profiles")
    .select("company_name")
    .eq("user_id", bk.partner_user_id)
    .maybeSingle();

  // ── Fetch post-completion refunds from portal DB ───────────────────────────
  const { data: refundRows } = await portalDb
    .from("partner_booking_refunds")
    .select("id, amount, reason, stripe_refund_id, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  const postCompletionRefunds = (refundRows ?? []).map((r: any) => ({
    id:               r.id,
    amount:           Number(r.amount),
    reason:           r.reason ?? null,
    stripe_refund_id: r.stripe_refund_id ?? null,
    created_at:       r.created_at,
  }));

  const currency    = (bk.currency || "EUR").toUpperCase();
  const ref         = bk.job_number ?? bookingId.slice(0, 8);
  const isAmended   = postCompletionRefunds.length > 0;
  const storagePath = `${bk.request_id}/completion-statement-${ref}${isAmended ? "-amended" : ""}.pdf`;

  const collectionFuel =
    normalizeFuel(bk.collection_fuel_level_partner) ||
    normalizeFuel(bk.collection_fuel_level_driver);
  const returnFuel =
    normalizeFuel(bk.return_fuel_level_partner) ||
    normalizeFuel(bk.return_fuel_level_driver);

  try {
    const pdfBuffer = await generateCompletionStatementPDF({
      jobNumber:            bk.job_number,
      bookingId,
      customerName:         null,
      pickupAddress:        cr.pickup_address    || null,
      dropoffAddress:       cr.dropoff_address   || null,
      pickupAt:             cr.pickup_at         || null,
      dropoffAt:            cr.dropoff_at        || null,
      durationMinutes:      cr.journey_duration_minutes || null,
      vehicleCategory:      cr.vehicle_category_name || null,
      companyName:          profile?.company_name || null,
      currency,
      carHire:              Number(bk.car_hire_price || 0),
      fuelDeposit:          Number(bk.fuel_price || 0),
      totalPaid:            Number(bk.amount || 0),
      collectionFuel,
      returnFuel,
      usedQuarters:         bk.fuel_used_quarters ?? 0,
      fuelCharge:           Number(bk.fuel_charge || 0),
      fuelRefund:           Number(bk.fuel_refund || 0),
      issuedAt:             new Date().toISOString(),
      postCompletionRefunds,
    });

    const { error: uploadErr } = await db.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("completion-statement: upload failed", uploadErr.message);
      return NextResponse.json({ error: "Failed to store statement" }, { status: 500 });
    }

    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    console.error("completion-statement: generation failed", e?.message);
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}
