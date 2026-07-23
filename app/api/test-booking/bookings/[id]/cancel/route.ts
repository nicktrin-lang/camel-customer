import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { sendEmail } from "@/lib/email";
import { cancelBookingRefund, CancelRefundType } from "@/lib/portal/cancelBooking";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

const PRE_COLLECTION_STATUSES = ["confirmed", "driver_assigned", "en_route", "arrived"];
const HOURS_48 = 48 * 60 * 60 * 1000;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const customerDb = createCustomerServiceRoleSupabaseClient();
    const { data: userData, error: userErr } = await customerDb.auth.getUser(accessToken);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const user = userData.user;

    const { id: bookingId } = await params;
    if (!bookingId) return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim() || null;

    const db = createServiceRoleSupabaseClient();

    const { data: booking, error: bkErr } = await db
      .from("partner_bookings")
      .select(`id, job_number, booking_status, partner_user_id, car_hire_price, fuel_price, currency, request_id`)
      .eq("id", bookingId)
      .maybeSingle();

    if (bkErr)    return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const { data: request } = await db
      .from("customer_requests")
      .select("id, customer_name, customer_email, pickup_at, pickup_address, customer_user_id")
      .eq("id", booking.request_id)
      .maybeSingle();

    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.customer_user_id !== user.id) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

    if (booking.booking_status === "cancelled") {
      return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    }
    if (!PRE_COLLECTION_STATUSES.includes(booking.booking_status)) {
      return NextResponse.json({
        error: "This booking cannot be cancelled — the car has already been collected or the hire is underway. No refund is available once the hire has started.",
      }, { status: 400 });
    }

    // ── 48hr rule ────────────────────────────────────────────────────────────
    const pickupAt         = request.pickup_at ? new Date(request.pickup_at).getTime() : null;
    const hoursUntilPickup = pickupAt ? pickupAt - Date.now() : null;
    const isWithin48hrs    = hoursUntilPickup !== null && hoursUntilPickup < HOURS_48;

    const refundType: CancelRefundType = isWithin48hrs ? "fuel_only" : "full";
    const refundStatus = isWithin48hrs ? "partial" : "full";

    // ── Issue the Stripe refund FIRST — only cancel once the money is on its way
    // back. Abort without cancelling if the refund fails, so it can be retried
    // (previously the booking was cancelled first and a failed refund left the
    // customer told "refunded" when they were not, with no way to retry).
    const refundResult = await cancelBookingRefund(bookingId, refundType);
    if (!refundResult.ok) {
      console.error("Customer cancel refund error:", refundResult.error);
      return NextResponse.json(
        { error: `Refund failed — booking NOT cancelled, please try again: ${refundResult.error}` },
        { status: 502 }
      );
    }

    // ── Refund succeeded — mark booking + request cancelled ──────────────────
    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({
        booking_status: "cancelled",
        cancelled_by: "customer",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        refund_status: refundStatus,
      })
      .eq("id", bookingId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    await db.from("customer_requests").update({ status: "cancelled" }).eq("id", booking.request_id);

    const refundAmount = !("already_processed" in refundResult)
      ? refundResult.refund_amount
      : isWithin48hrs
        ? Number(booking.fuel_price || 0)
        : Number(booking.car_hire_price || 0) + Number(booking.fuel_price || 0);

    // ── Emails ───────────────────────────────────────────────────────────────
    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const { data: partnerAuthData } = await db.auth.admin.getUserById(booking.partner_user_id);
    const partnerEmail = partnerAuthData?.user?.email || null;

    const jobNo       = booking.job_number ? `#${booking.job_number}` : "";
    const companyName = partnerProfile?.company_name || "the car hire company";
    const pickupTime  = request.pickup_at
      ? new Date(request.pickup_at).toLocaleString("en-GB", { timeZone: "Europe/Madrid" })
      : "—";
    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
    const curr        = booking.currency || "EUR";
    const fmt         = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: curr }).format(n);
    const carHire     = Number(booking.car_hire_price || 0);

    const refundNote = isWithin48hrs
      ? `As this cancellation is within 48 hours of your pickup time, the car hire fee of ${fmt(carHire)} is non-refundable. Your fuel deposit of ${fmt(refundAmount)} will be refunded in full.`
      : `As this cancellation is more than 48 hours before your pickup time, a full refund of ${fmt(refundAmount)} will be processed.`;

    const customerEmail = request.customer_email || user.email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Your Camel Global booking ${jobNo} has been cancelled`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">Booking Cancelled</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Hi ${request.customer_name || "there"},</p>
              <p>Your booking ${jobNo} with ${companyName} has been cancelled.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p><strong>Pickup was:</strong> ${pickupTime}<br/><strong>Location:</strong> ${request.pickup_address || "—"}</p>
              <div style="background:${isWithin48hrs ? "#fff8f4" : "#f0fff4"};border:1px solid ${isWithin48hrs ? "#ff7a00" : "#22c55e"};padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:700;">${isWithin48hrs ? "⚠ Partial Refund" : "✅ Full Refund"}</p>
                <p style="margin:8px 0 0;font-size:14px;">${refundNote}</p>
                <p style="margin:8px 0 0;font-weight:700;">Refund total: ${fmt(refundAmount)}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#666;">Please allow 5–10 business days for the refund to appear on your statement.</p>
              </div>
              <p>Questions? Email <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a></p>
              <a href="${siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View My Bookings</a>
              <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    if (partnerEmail) {
      await sendEmail({
        to: partnerEmail,
        subject: `Booking ${jobNo} cancelled by customer`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;"><h2 style="color:#fff;margin:0;">Booking Cancelled by Customer</h2></div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Booking ${jobNo} has been cancelled by the customer.</p>
              <p>
                <strong>Customer:</strong> ${request.customer_name || "—"}<br/>
                <strong>Pickup was:</strong> ${pickupTime}<br/>
                <strong>Refund:</strong> ${refundStatus === "full" ? "Full refund" : "Partial refund (fuel deposit only — within 48hrs)"} — ${fmt(refundAmount)}
              </p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p>No action required from you.</p>
              <p style="color:#999;font-size:13px;">The Camel Global Team</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `[Admin] Booking ${jobNo} cancelled by customer`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>Booking <strong>${jobNo}</strong> cancelled by customer.</p>
            <p>
              <strong>Partner:</strong> ${companyName}<br/>
              <strong>Customer:</strong> ${request.customer_name} (${customerEmail})<br/>
              <strong>Refund:</strong> ${refundStatus} — ${fmt(refundAmount)}<br/>
              <strong>Within 48hrs:</strong> ${isWithin48hrs ? "Yes" : "No"}<br/>
              <strong>Stripe refund:</strong> ${refundResult.ok && !("already_processed" in refundResult) ? (refundResult.stripe_refund_id || "none (£0 refund)") : "see logs"}
            </p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          </div>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, refund_status: refundStatus, refund_amount: refundAmount, within_48hrs: isWithin48hrs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}