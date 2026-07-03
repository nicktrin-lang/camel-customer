import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { calculateCommission } from "@/lib/portal/calculateCommission";
import { coerceCurrency, type Currency } from "@/lib/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

// Approximate EUR→X multipliers used ONLY to convert the €10 minimum-commission
// floor into the bid currency. The commission itself is percentage-based; this
// floor only bites on very small hires. Rough fixed rates are acceptable here.
const MIN_FLOOR_RATE: Record<Currency, number> = {
  EUR: 1,
  GBP: 0.85,
  USD: 1.08,
  AUD: 1.63,
  NZD: 1.78,
  CAD: 1.47,
};

function fmtAmt(n: number, currency: string): string {
  return `${currency} ${n.toFixed(2)}`;
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const customerDb = createCustomerServiceRoleSupabaseClient();
    const { data: userData, error: userErr } = await customerDb.auth.getUser(accessToken);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const customerUser = userData.user;

    const body  = await req.json().catch(() => null);
    const bidId = String(body?.bid_id || "").trim();
    if (!bidId) return NextResponse.json({ error: "Missing bid_id" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();

    const { data: bid } = await db
      .from("partner_bids")
      .select("*")
      .eq("id", bidId)
      .maybeSingle();

    if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

    const { data: request } = await db
      .from("customer_requests")
      .select("id, status, expires_at, job_number")
      .eq("id", bid.request_id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "open") return NextResponse.json({ error: "This request is no longer open." }, { status: 400 });
    if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This request has expired." }, { status: 400 });
    }

    // ── Customer always pays in the partner's bid currency — no conversion ──
    const currency     = coerceCurrency(bid.currency);
    const carHirePrice = Number(bid.car_hire_price || 0);
    const fuelPrice    = Number(bid.fuel_price || 0);
    const totalPrice   = Math.round((carHirePrice + fuelPrice) * 100) / 100;

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, commission_rate, company_name")
      .eq("user_id", bid.partner_user_id)
      .maybeSingle();

    if (!partnerProfile?.stripe_account_id || !partnerProfile?.stripe_onboarding_complete) {
      return NextResponse.json({ error: "This partner has not set up payouts yet. Please choose another bid." }, { status: 400 });
    }

    const { data: platform } = await db
      .from("platform_settings")
      .select("default_commission_rate, minimum_commission_amount")
      .limit(1)
      .maybeSingle();

    const commissionRatePct = partnerProfile.commission_rate ?? platform?.default_commission_rate ?? 20;
    // Minimum commission is stored in EUR — convert to the bid currency using the
    // fixed floor rates above. The floor only matters for very small hires.
    const minCommissionEur  = platform?.minimum_commission_amount ?? 10;
    const minCommission     = Math.round(minCommissionEur * (MIN_FLOOR_RATE[currency] ?? 1) * 100) / 100;

    const { commissionAmount, partnerPayoutAmount } = calculateCommission(
      carHirePrice,
      commissionRatePct,
      minCommission
    );

    const totalCents      = Math.round(totalPrice * 100);
    const commissionCents = Math.round(commissionAmount * 100);

    const jobLabel    = request.job_number ? `#${request.job_number}` : bidId.slice(0, 8);
    const partnerName = partnerProfile.company_name || "Partner";

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalCents,
      currency: currency.toLowerCase(),
      description: `Camel Global ${jobLabel} | ${partnerName} | Car hire ${fmtAmt(carHirePrice, currency)} + Fuel ${fmtAmt(fuelPrice, currency)} | Commission ${fmtAmt(commissionAmount, currency)} | Partner net ${fmtAmt(partnerPayoutAmount + fuelPrice, currency)}`,
      on_behalf_of:           partnerProfile.stripe_account_id,
      application_fee_amount: commissionCents,
      transfer_data: { destination: partnerProfile.stripe_account_id },
      metadata: {
        job_number:        String(request.job_number || ""),
        partner_name:      partnerName,
        car_hire:          fmtAmt(carHirePrice, currency),
        fuel_deposit:      fmtAmt(fuelPrice, currency),
        total_charged:     fmtAmt(totalPrice, currency),
        camel_commission:  fmtAmt(commissionAmount, currency),
        commission_rate:   `${commissionRatePct}%`,
        partner_net:       fmtAmt(partnerPayoutAmount + fuelPrice, currency),
        car_hire_price:    carHirePrice.toString(),
        fuel_price:        fuelPrice.toString(),
        commission_amount: commissionAmount.toString(),
        currency,
        bid_id:            bidId,
        request_id:        bid.request_id,
        customer_user_id:  customerUser.id,
        partner_user_id:   bid.partner_user_id,
      },
      capture_method: "automatic",
    });

    return NextResponse.json({
      client_secret:     paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_total:      totalPrice,
      amount_car_hire:   carHirePrice,
      amount_fuel:       fuelPrice,
      commission:        commissionAmount,
      currency,
      partner_name:      partnerName,
    });
  } catch (e: any) {
    console.error("create-intent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
