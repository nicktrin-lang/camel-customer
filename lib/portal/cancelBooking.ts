import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

export type CancelRefundType = "full" | "fuel_only" | "none";

export type CancelBookingResult =
  | { ok: true; already_processed: true }
  | { ok: true; refund_type: CancelRefundType; refund_amount: number; stripe_refund_id: string | null }
  | { ok: false; error: string; status: number };

/**
 * Issues the Stripe refund for a cancelled booking and records the ledger.
 *
 * Platform-hold model: the charge sits on Camel's platform balance and the partner
 * has NOT been paid yet (partners are paid the settled net monthly). So a refund is
 * a plain refund against the charge — there is no transfer to reverse and no
 * application fee to return.
 *
 * refund_type:
 *   "full"      — refund car hire + fuel deposit (>48h cancel). Nothing owed to the
 *                 partner → booking payout_status = 'cancelled'.
 *   "fuel_only" — refund fuel deposit only (<48h cancel). Partner keeps the car-hire
 *                 fee and Camel keeps its commission (both already on the platform
 *                 balance) → booking payout_status = 'ready' with settled_partner_net
 *                 = car_hire − commission, paid at month-end.
 *   "none"      — no refund.
 *
 * Writes payout_status to BOTH partner_bookings and payments — the monthly cron
 * reads partner_bookings, so setting only payments (as before) let it pay cancelled
 * bookings. Idempotency-keyed on the booking; refund is capped at the amount still
 * refundable on the charge.
 */
export async function cancelBookingRefund(
  bookingId: string,
  refundType: CancelRefundType
): Promise<CancelBookingResult> {
  if (refundType === "none") {
    return { ok: true, refund_type: "none", refund_amount: 0, stripe_refund_id: null };
  }

  const db = createServiceRoleSupabaseClient();

  // Load the payment — amounts are in charge currency (what Stripe processed).
  const { data: payment, error: pmtErr } = await db
    .from("payments")
    .select(`
      id, stripe_payment_intent_id,
      amount_car_hire, amount_fuel_deposit, amount_commission, amount_total,
      fuel_refund_amount, cancellation_refund_amount, cancelled_refunded_at
    `)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (pmtErr) return { ok: false, error: pmtErr.message, status: 400 };

  // No payment record = test/manual booking — no Stripe refund, but still set the
  // booking's payout state so the monthly cron treats it correctly.
  if (!payment) {
    await db.from("partner_bookings")
      .update({ payout_status: refundType === "fuel_only" ? "ready" : "cancelled" })
      .eq("id", bookingId);
    console.log(`cancelBookingRefund: no payment record for ${bookingId} — skipping Stripe refund`);
    return { ok: true, refund_type: "none", refund_amount: 0, stripe_refund_id: null };
  }

  // Idempotency — already refunded
  if (payment.cancelled_refunded_at) {
    return { ok: true, already_processed: true };
  }

  const carHireAmount = Number(payment.amount_car_hire     || 0);
  const fuelDepAmount = Number(payment.amount_fuel_deposit || 0);
  const commission    = Number(payment.amount_commission   || 0);
  const total         = Number(payment.amount_total || carHireAmount + fuelDepAmount);

  // Never refund more than remains on the charge — guards against refunding a
  // booking that already had a fuel refund or a prior cancellation refund.
  const priorRefunds = Number(payment.fuel_refund_amount || 0) + Number(payment.cancellation_refund_amount || 0);
  const remaining    = Math.max(0, Math.round((total - priorRefunds) * 100) / 100);

  const requested    = refundType === "full" ? carHireAmount + fuelDepAmount : fuelDepAmount;
  const refundAmount = Math.min(requested, remaining);
  const refundCents  = Math.round(refundAmount * 100);

  let stripeRefundId: string | null = null;

  if (refundCents > 0 && payment.stripe_payment_intent_id) {
    try {
      // Plain refund from Camel's platform balance. Nothing was transferred to the
      // partner under platform-hold, so there is no transfer to reverse and no
      // application fee to return. Idempotency-keyed so a retry can't double-refund.
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount:         refundCents,
        reason:         "requested_by_customer",
        metadata: {
          booking_id:    bookingId,
          refund_type:   refundType,
          refund_amount: String(refundAmount),
        },
      }, {
        idempotencyKey: `cancelrefund_${bookingId}`,
      });
      stripeRefundId = refund.id;
    } catch (err: any) {
      console.error("Stripe cancellation refund error:", err?.message);
      return { ok: false, error: `Stripe refund failed: ${err?.message}`, status: 500 };
    }
  }

  const now = new Date().toISOString();

  // Booking-level payout state — the monthly cron reads partner_bookings, so this
  // MUST be written here (previously only payments was set, so the cron still paid
  // cancelled bookings). fuel_only keeps the partner's car-hire fee as a settled net.
  const settledNet = refundType === "fuel_only"
    ? Math.round((carHireAmount - commission) * 100) / 100
    : null;

  const { error: bkUpdateErr } = await db
    .from("partner_bookings")
    .update(
      refundType === "fuel_only"
        ? { payout_status: "ready", settled_partner_net: settledNet, settled_at: now }
        : { payout_status: "cancelled" }
    )
    .eq("id", bookingId);

  if (bkUpdateErr) return { ok: false, error: bkUpdateErr.message, status: 500 };

  const { error: pmtUpdateErr } = await db
    .from("payments")
    .update({
      cancellation_refund_amount:    refundAmount,
      cancellation_refund_stripe_id: stripeRefundId,
      cancelled_refunded_at:         now,
      payout_status:                 refundType === "fuel_only" ? "ready" : "cancelled",
    })
    .eq("id", payment.id);

  if (pmtUpdateErr) return { ok: false, error: pmtUpdateErr.message, status: 500 };

  console.log(`cancelBookingRefund: ${bookingId} — ${refundType} refund ${refundAmount}, stripe ${stripeRefundId || "none"}`);
  return { ok: true, refund_type: refundType, refund_amount: refundAmount, stripe_refund_id: stripeRefundId };
}