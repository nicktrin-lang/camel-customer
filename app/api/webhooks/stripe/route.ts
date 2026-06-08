import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";
import { sendEmail } from "@/lib/email";
import { sendBookingReceiptEmail } from "@/lib/portal/generateBookingReceiptPDF";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getStripeFeeData(chargeId: string | null): Promise<{
  stripe_fee: number | null;
  stripe_fee_currency: string | null;
}> {
  const empty = { stripe_fee: null, stripe_fee_currency: null };
  if (!chargeId) return empty;
  try {
    const charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
    const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
    if (!bt || typeof bt === "string") return empty;
    return {
      stripe_fee:          bt.fee != null ? bt.fee / 100 : null,
      stripe_fee_currency: bt.fee_details?.[0]?.currency?.toUpperCase() || null,
    };
  } catch (e: any) {
    console.error("getStripeFeeData error:", e?.message);
    return empty;
  }
}

// Look up customer communication_locale from customer_profiles via email match
async function getCustomerLocale(customerEmail: string): Promise<"en" | "es"> {
  try {
    const { data: usersData } = await db.auth.admin.listUsers();
    const matchedUser = usersData?.users?.find(u => (u.email || "").toLowerCase() === customerEmail.toLowerCase());
    if (!matchedUser) return "en";
    const { data } = await db
      .from("customer_profiles")
      .select("communication_locale")
      .eq("user_id", matchedUser.id)
      .maybeSingle();
    return (data?.communication_locale === "es") ? "es" : "en";
  } catch {
    return "en";
  }
}

// Look up partner communication_locale from partner_profiles
async function getPartnerLocale(partnerUserId: string): Promise<"en" | "es"> {
  try {
    const { data } = await db
      .from("partner_profiles")
      .select("communication_locale")
      .eq("user_id", partnerUserId)
      .maybeSingle();
    return (data?.communication_locale === "es") ? "es" : "en";
  } catch {
    return "en";
  }
}

function brandEmail(
  headingEN: string,
  headingES: string,
  bodyEN: string,
  bodyES: string,
  locale: "en" | "es"
): string {
  const heading = locale === "es" ? headingES : headingEN;
  const body    = locale === "es" ? bodyES    : bodyEN;
  const sign    = locale === "es"
    ? `<p style="margin-top:32px;color:#888;font-size:14px;">Saludos,<br/><strong style="color:#222;">El equipo de Camel Global</strong></p>`
    : `<p style="margin-top:32px;color:#888;font-size:14px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong></p>`;
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#222;line-height:1.6;max-width:600px;">
      <div style="background:#000;padding:24px 32px;">
        <h2 style="color:#fff;margin:0;">${heading}</h2>
      </div>
      <div style="background:#f8f8f8;padding:24px 32px;border:1px solid #e5e5e5;">
        ${body}
        ${sign}
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m  = pi.metadata;

      const bidId         = m.bid_id;
      const requestId     = m.request_id;
      const partnerUserId = m.partner_user_id;
      const jobNumber     = m.job_number ? Number(m.job_number) : null;
      const chargeId      = typeof pi.latest_charge === "string" ? pi.latest_charge : null;

      const currency       = (m.currency || "EUR").toUpperCase();
      const carHirePrice   = Number(m.car_hire_price    || 0);
      const fuelPrice      = Number(m.fuel_price        || 0);
      const commissionAmt  = Number(m.commission_amount || 0);
      const commissionRate = Number((m.commission_rate  || "20").replace("%", ""));
      const totalPrice     = carHirePrice + fuelPrice;
      const partnerNet     = Math.max(0, carHirePrice - commissionAmt);

      const { data: bid } = await db
        .from("partner_bids")
        .select("currency, notes, car_hire_price, fuel_price, total_price, vehicle_category_name, mileage_limit, security_deposit_notes")
        .eq("id", bidId)
        .maybeSingle();

      const bidCarHire    = Number(bid?.car_hire_price || 0);
      const bidFuel       = Number(bid?.fuel_price     || 0);
      const bidTotalPrice = Number(bid?.total_price    || bidCarHire + bidFuel);
      const notes         = bid?.notes || null;
      const vehicleCategory = bid?.vehicle_category_name || null;

      const { data: request } = await db
        .from("customer_requests")
        .select(`
          status, customer_name, customer_email,
          pickup_address, dropoff_address, pickup_at, dropoff_at,
          journey_duration_minutes,
          vehicle_category_name,
          passengers, suitcases, hand_luggage, sport_equipment,
          driver_age, additional_drivers, additional_driver_ages
        `)
        .eq("id", requestId)
        .maybeSingle();

      if (request?.status !== "open") {
        console.log(`Payment succeeded but request ${requestId} is ${request?.status} — skipping`);
        return NextResponse.json({ received: true });
      }

      await db.from("partner_bids").update({ status: "accepted" }).eq("id", bidId);
      await db.from("partner_bids").update({ status: "unsuccessful" }).eq("request_id", requestId).neq("id", bidId);
      await db.from("customer_requests").update({ status: "confirmed" }).eq("id", requestId);
      await db.from("request_partner_matches").update({ match_status: "accepted" }).eq("request_id", requestId).eq("partner_user_id", partnerUserId);
      await db.from("request_partner_matches").update({ match_status: "closed" }).eq("request_id", requestId).neq("partner_user_id", partnerUserId);

      const { data: existing } = await db
        .from("partner_bookings")
        .select("id")
        .eq("winning_bid_id", bidId)
        .maybeSingle();

      let bookingId = existing?.id;

      if (!bookingId) {
        const { data: inserted, error: bookingErr } = await db
          .from("partner_bookings")
          .insert({
            request_id:            requestId,
            winning_bid_id:        bidId,
            partner_user_id:       partnerUserId,
            booking_status:        "confirmed",
            currency,
            charge_currency:       currency,
            conversion_rate:       1,
            amount:                bidTotalPrice,
            car_hire_price:        bidCarHire,
            fuel_price:            bidFuel,
            commission_rate:       commissionRate,
            commission_amount:     commissionAmt,
            partner_payout_amount: partnerNet,
            notes,
            job_number:            jobNumber,
            payout_status:         "held",
          })
          .select("id")
          .single();

        if (bookingErr) {
          console.error("Booking insert error:", bookingErr);
          return NextResponse.json({ error: bookingErr.message }, { status: 500 });
        }
        bookingId = inserted.id;
      }

      const feeData = await getStripeFeeData(chargeId);

      await db.from("payments").insert({
        booking_id:               bookingId,
        customer_id:              null,
        stripe_payment_intent_id: pi.id,
        stripe_charge_id:         chargeId,
        amount_total:             totalPrice,
        amount_car_hire:          carHirePrice,
        amount_fuel_deposit:      fuelPrice,
        amount_commission:        commissionAmt,
        amount_partner_net:       partnerNet,
        currency,
        status:                   "succeeded",
        payout_status:            "held",
        stripe_fee:               feeData.stripe_fee,
        stripe_fee_currency:      feeData.stripe_fee_currency,
        exchange_rate:            null,
      });

      const { data: payment } = await db
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (payment?.id) {
        await db.from("partner_bookings").update({ payment_id: payment.id }).eq("id", bookingId);
      }

      await syncBookingStatuses(bookingId);

      const { data: partnerProfile } = await db
        .from("partner_profiles")
        .select("company_name, contact_name")
        .eq("user_id", partnerUserId)
        .maybeSingle();

      const { data: partnerAuthData } = await db.auth.admin.getUserById(partnerUserId);
      const partnerEmail = partnerAuthData?.user?.email || null;

      const jobNo       = jobNumber ? `#${jobNumber}` : "";
      const companyName = partnerProfile?.company_name || "your car hire partner";
      const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
      const portalUrl   = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.camel-global.com";
      const fmtAmt      = (n: number) => new Intl.NumberFormat(
        currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES",
        { style: "currency", currency }
      ).format(n);
      const pickupTime  = request?.pickup_at
        ? new Date(request.pickup_at).toLocaleString("en-GB", { timeZone: "Europe/Madrid" })
        : "—";
      const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

      // Look up locales for customer and partner
      const [customerLocale, partnerLocale] = await Promise.all([
        request?.customer_email ? getCustomerLocale(request.customer_email) : Promise.resolve<"en" | "es">("en"),
        getPartnerLocale(partnerUserId),
      ]);

      // ── Booking receipt PDF email (customer) ──────────────────────────────
      if (request?.customer_email) {
        sendBookingReceiptEmail({
          jobNumber,
          bookingId,
          requestId,
          customerName:         request.customer_name || null,
          customerEmail:        request.customer_email,
          pickupAddress:        request.pickup_address || null,
          dropoffAddress:       request.dropoff_address || null,
          pickupAt:             request.pickup_at || null,
          dropoffAt:            request.dropoff_at || null,
          durationMinutes:      request.journey_duration_minutes ?? null,
          vehicleCategory:      request.vehicle_category_name || vehicleCategory || null,
          companyName,
          chargeCurrency:       currency,
          chargeCarHire:        bidCarHire,
          chargeFuel:           bidFuel,
          chargeTotal:          bidTotalPrice,
          passengers:           request.passengers ?? null,
          suitcases:            request.suitcases ?? null,
          handLuggage:          request.hand_luggage ?? null,
          sportEquipment:       request.sport_equipment ?? null,
          driverAge:            request.driver_age ?? null,
          additionalDrivers:    request.additional_drivers ?? 0,
          additionalDriverAges: request.additional_driver_ages ?? null,
          mileageLimit:         bid?.mileage_limit ?? null,
          securityDepositNotes: bid?.security_deposit_notes ?? null,
        }).catch(e => console.error("Booking receipt PDF email failed:", e?.message));
      }

      // ── Customer booking confirmed email (locale-aware) ───────────────────
      if (request?.customer_email) {
        const custName = request.customer_name || (customerLocale === "es" ? "hola" : "there");

        const priceTableEN = `
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#666;">Booking reference</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Car hire partner</td><td style="text-align:right;">${companyName}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Pickup time</td><td style="text-align:right;">${pickupTime}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Pickup address</td><td style="text-align:right;">${request.pickup_address || "—"}</td></tr>
            ${request.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">Drop-off address</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
            <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;color:#666;">Car hire</td><td style="text-align:right;">${fmtAmt(bidCarHire)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Fuel deposit</td><td style="text-align:right;">${fmtAmt(bidFuel)}</td></tr>
            <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;font-weight:700;">Total paid</td><td style="text-align:right;font-weight:700;">${fmtAmt(bidTotalPrice)}</td></tr>
          </table>
          <p style="margin:8px 0 0;font-size:13px;color:#666;">The fuel deposit will be refunded at the end of your hire based on fuel used.</p>`;

        const priceTableES = `
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#666;">Referencia de reserva</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Empresa de alquiler</td><td style="text-align:right;">${companyName}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Hora de recogida</td><td style="text-align:right;">${pickupTime}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Dirección de recogida</td><td style="text-align:right;">${request.pickup_address || "—"}</td></tr>
            ${request.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">Dirección de devolución</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
            <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;color:#666;">Alquiler</td><td style="text-align:right;">${fmtAmt(bidCarHire)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Depósito de combustible</td><td style="text-align:right;">${fmtAmt(bidFuel)}</td></tr>
            <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;font-weight:700;">Total pagado</td><td style="text-align:right;font-weight:700;">${fmtAmt(bidTotalPrice)}</td></tr>
          </table>
          <p style="margin:8px 0 0;font-size:13px;color:#666;">El depósito de combustible se reembolsará al finalizar el alquiler según el combustible utilizado.</p>`;

        const custBodyEN = `
          <p>Hi ${custName},</p>
          <p>Your payment has been received and your booking is confirmed with <strong>${companyName}</strong>.</p>
          <div style="background:#fff;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">Booking Summary</p>
            ${priceTableEN}
          </div>
          <p style="font-size:13px;color:#666;">Your booking confirmation receipt will arrive in a separate email shortly.</p>
          <p style="margin:24px 0;">
            <a href="${siteUrl}/bookings/${requestId}" style="background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;display:inline-block;">View Booking</a>
          </p>`;

        const custBodyES = `
          <p>Hola ${custName},</p>
          <p>Tu pago ha sido recibido y tu reserva está confirmada con <strong>${companyName}</strong>.</p>
          <div style="background:#fff;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">Resumen de la reserva</p>
            ${priceTableES}
          </div>
          <p style="font-size:13px;color:#666;">El recibo de confirmación de tu reserva llegará en un correo aparte en breve.</p>
          <p style="margin:24px 0;">
            <a href="${siteUrl}/bookings/${requestId}" style="background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;display:inline-block;">Ver reserva</a>
          </p>`;

        await sendEmail({
          to: request.customer_email,
          subject: customerLocale === "es"
            ? `Reserva confirmada ${jobNo} — pago recibido`
            : `Booking confirmed ${jobNo} — payment received`,
          html: brandEmail(
            "Booking Confirmed ✅",
            "Reserva confirmada ✅",
            custBodyEN,
            custBodyES,
            customerLocale,
          ),
        }).catch(e => console.error("Customer booking confirmed email failed:", e?.message));
      }

      // ── Partner new booking email (locale-aware) ──────────────────────────
      if (partnerEmail) {
        const partnerName = partnerProfile?.contact_name || companyName;

        const partnerBodyEN = `
          <p>Hi ${partnerName},</p>
          <p>A customer has paid and confirmed booking ${jobNo}. Please prepare for collection.</p>
          <div style="background:#fff;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">Booking Details</p>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:4px 0;color:#666;">Booking reference</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Customer</td><td style="text-align:right;">${request?.customer_name || "—"}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Pickup time</td><td style="text-align:right;">${pickupTime}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Pickup address</td><td style="text-align:right;">${request?.pickup_address || "—"}</td></tr>
              ${request?.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">Drop-off address</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
              <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;color:#666;">Car hire</td><td style="text-align:right;">${fmtAmt(bidCarHire)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Fuel deposit</td><td style="text-align:right;">${fmtAmt(bidFuel)}</td></tr>
            </table>
          </div>
          <p style="margin:24px 0;">
            <a href="${portalUrl}/partner/bookings/${bookingId}" style="background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;display:inline-block;">View Booking</a>
          </p>`;

        const partnerBodyES = `
          <p>Hola ${partnerName},</p>
          <p>Un cliente ha pagado y confirmado la reserva ${jobNo}. Por favor, prepárate para la recogida.</p>
          <div style="background:#fff;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">Detalles de la reserva</p>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:4px 0;color:#666;">Referencia de reserva</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Cliente</td><td style="text-align:right;">${request?.customer_name || "—"}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Hora de recogida</td><td style="text-align:right;">${pickupTime}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Dirección de recogida</td><td style="text-align:right;">${request?.pickup_address || "—"}</td></tr>
              ${request?.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">Dirección de devolución</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
              <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;color:#666;">Alquiler</td><td style="text-align:right;">${fmtAmt(bidCarHire)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Depósito de combustible</td><td style="text-align:right;">${fmtAmt(bidFuel)}</td></tr>
            </table>
          </div>
          <p style="margin:24px 0;">
            <a href="${portalUrl}/partner/bookings/${bookingId}" style="background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;display:inline-block;">Ver reserva</a>
          </p>`;

        await sendEmail({
          to: partnerEmail,
          subject: partnerLocale === "es"
            ? `Nueva reserva confirmada ${jobNo}`
            : `New booking confirmed ${jobNo}`,
          html: brandEmail(
            "New Booking Confirmed",
            "Nueva reserva confirmada",
            partnerBodyEN,
            partnerBodyES,
            partnerLocale,
          ),
        }).catch(e => console.error("Partner new booking email failed:", e?.message));
      }

      // ── Admin email (always English, full details) ────────────────────────
      for (const adminEmail of adminEmails) {
        await sendEmail({
          to: adminEmail,
          subject: `[Admin] New booking ${jobNo} — ${companyName}`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <p>New booking confirmed.</p>
              <p>
                <strong>Booking:</strong> ${jobNo}<br/>
                <strong>Partner:</strong> ${companyName}<br/>
                <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
                <strong>Customer email locale:</strong> ${customerLocale}<br/>
                <strong>Partner email locale:</strong> ${partnerLocale}<br/>
                <strong>Pickup:</strong> ${pickupTime}<br/>
                <strong>Pickup address:</strong> ${request?.pickup_address || "—"}<br/>
                <strong>Currency:</strong> ${currency}<br/>
                <strong>Car hire:</strong> ${fmtAmt(bidCarHire)}<br/>
                <strong>Fuel deposit:</strong> ${fmtAmt(bidFuel)}<br/>
                <strong>Total:</strong> ${fmtAmt(bidTotalPrice)}<br/>
                <strong>Commission:</strong> ${fmtAmt(commissionAmt)} (${commissionRate}%)<br/>
                <strong>Partner net:</strong> ${fmtAmt(partnerNet)}<br/>
                <strong>Stripe fee:</strong> ${feeData.stripe_fee != null ? `${feeData.stripe_fee} ${feeData.stripe_fee_currency}` : "pending"}
              </p>
            </div>
          `,
        }).catch(e => console.error("Admin new booking email failed:", e?.message));
      }

      console.log(`payment_intent.succeeded: booking ${bookingId} — currency ${currency}, fee ${feeData.stripe_fee} ${feeData.stripe_fee_currency}, customer locale ${customerLocale}, partner locale ${partnerLocale}`);
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}