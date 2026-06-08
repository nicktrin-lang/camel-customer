import { NextResponse } from "next/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUser(accessToken: string | null) {
  if (!accessToken) return null;
  const db = createCustomerServiceRoleSupabaseClient();
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

function fmt(v?: string | null) {
  if (!v) return "not set";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Europe/Madrid" }); } catch { return v; }
}

function bookingStatusReadable(s?: string | null) {
  switch (String(s || "").toLowerCase()) {
    case "confirmed": return "Confirmed — awaiting driver assignment";
    case "driver_assigned": return "Driver assigned — awaiting delivery";
    case "en_route": return "Driver en route";
    case "arrived": return "Driver has arrived";
    case "collected": return "Car collected — on hire";
    case "returned": return "Car returned";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s || "unknown").replaceAll("_", " ");
  }
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const user = await getCustomerUser(accessToken);
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const messages: { role: string; content: string }[] = body?.messages || [];
    if (!messages.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

    // Fetch customer's recent requests + bookings
    const db = createServiceRoleSupabaseClient();
    const locale = body?.locale === "es" ? "es" : "en";
    const { data: requests } = await db
      .from("customer_requests")
      .select("id, job_number, pickup_address, dropoff_address, pickup_at, dropoff_at, status, vehicle_category_name, passengers, notes, created_at")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const requestIds = (requests || []).map((r: any) => r.id);
    let bookings: any[] = [];
    if (requestIds.length > 0) {
      const { data: bkRows } = await db
        .from("partner_bookings")
        .select(`
          id, job_number, booking_status, amount, currency,
          car_hire_price, fuel_price, fuel_charge, fuel_refund,
          driver_name, driver_phone, driver_vehicle, driver_notes,
          driver_assigned_at, created_at, request_id,
          collection_confirmed_by_driver, return_confirmed_by_driver,
          collection_confirmed_by_customer, return_confirmed_by_customer,
          winning_bid_id
        `)
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      // Fetch partner profiles for company info
      const partnerIds = Array.from(new Set((bkRows || []).map((b: any) => b.partner_user_id).filter(Boolean)));
      let profileMap = new Map<string, any>();
      if (partnerIds.length > 0) {
        const { data: profiles } = await db
          .from("partner_profiles")
          .select("user_id, company_name, phone")
          .in("user_id", partnerIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      // Also get company from bids
      const bidIds = (bkRows || []).map((b: any) => b.winning_bid_id).filter(Boolean);
      let bidPartnerMap = new Map<string, string>();
      if (bidIds.length > 0) {
        const { data: bids } = await db
          .from("partner_bids")
          .select("id, partner_user_id")
          .in("id", bidIds);
        bidPartnerMap = new Map((bids || []).map((b: any) => [b.id, b.partner_user_id]));
      }

      bookings = (bkRows || []).map((b: any) => {
        const partnerId = b.partner_user_id || bidPartnerMap.get(b.winning_bid_id);
        const profile = profileMap.get(partnerId) || null;
        const request = (requests || []).find((r: any) => r.id === b.request_id);
        return { ...b, company_name: profile?.company_name || null, company_phone: profile?.phone || null, request };
      });
    }

    // Build context string for the AI
    const bookingContext = bookings.length === 0 && (requests || []).length === 0
      ? "This customer has no bookings or requests yet."
      : [
          ...(requests || []).map((r: any) => {
            const bk = bookings.find((b: any) => b.request_id === r.id);
            const lines = [
              `--- Request #${r.job_number || r.id.slice(0, 8)} ---`,
              `Status: ${r.status}`,
              `Pickup: ${r.pickup_address}`,
              `Drop-off: ${r.dropoff_address || "not set"}`,
              `Pickup time: ${fmt(r.pickup_at)}`,
              `Drop-off time: ${fmt(r.dropoff_at)}`,
              `Vehicle: ${r.vehicle_category_name || "any"}`,
              `Passengers: ${r.passengers}`,
            ];
            if (bk) {
              lines.push(
                `Booking status: ${bookingStatusReadable(bk.booking_status)}`,
                `Car hire company: ${bk.company_name || "not assigned"}`,
                `Company phone/WhatsApp: ${bk.company_phone || "not available"}`,
                `Driver: ${bk.driver_name || "not yet assigned"}`,
                `Driver phone/WhatsApp: ${bk.driver_phone || "not yet assigned"}`,
                `Driver vehicle: ${bk.driver_vehicle || "not yet assigned"}`,
                `Car hire price: ${bk.car_hire_price} ${bk.currency}`,
                `Fuel deposit: ${bk.fuel_price} ${bk.currency}`,
                `Total paid: ${bk.amount} ${bk.currency}`,
              );
              if (bk.fuel_charge != null) lines.push(`Fuel charge: ${bk.fuel_charge} ${bk.currency}`);
              if (bk.fuel_refund != null) lines.push(`Fuel refund: ${bk.fuel_refund} ${bk.currency}`);
            }
            return lines.join("\n");
          }),
        ].join("\n\n");

    const customerName = String(user.user_metadata?.full_name || user.email || "the customer").split("@")[0];

    const systemPrompt = `You are Camel Help, the friendly AI assistant for Camel Global — a meet & greet car hire platform operating in Spain.

You are talking to a CUSTOMER named ${customerName}.

Your job is to help customers with questions about their bookings, the platform, and any issues. Be concise, friendly, and helpful. Use plain language.

TODAY'S DATE/TIME: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/Madrid" })} (Spain time)

== HOW CAMEL GLOBAL WORKS ==
- Customers book a car hire online. Car hire companies (partners) submit bids. The customer accepts the bid they prefer.
- A driver then delivers the hired car to the customer's pickup address (meet & greet style).
- The driver records the fuel level at delivery and collection. The customer pays a refundable full-tank deposit — any fuel used is charged per quarter tank, any unused is refunded.
- Insurance documents are handed over by the driver at delivery.
- Bookings go through these statuses: open → confirmed → driver assigned → en route → arrived → collected (on hire) → returned → completed.

== CANCELLATION POLICY ==
- If the PARTNER cancels: customer receives a full refund of everything.
- If the CUSTOMER cancels MORE than 48 hours before pickup: full refund of everything.
- If the CUSTOMER cancels WITHIN 48 hours of pickup: car hire fee is NOT refunded, but the full fuel deposit IS refunded (as the fuel was never used).
- To request a cancellation, the customer should contact support or use the cancellation option on their booking page (coming soon).

== CONTACT & ESCALATION ==
- If a driver hasn't arrived, tell the customer to WhatsApp the driver directly using the number on their booking page. If no driver is assigned yet, they should WhatsApp the car hire company.
- For serious issues not resolved by WhatsApp, advise them to email contact@camel-global.com.

== WHAT YOU CAN AND CANNOT DO ==
- You CAN tell the customer their booking details, status, driver info, and pricing from the data below.
- You CAN give the driver's WhatsApp number if asked — say "Your driver's WhatsApp number is [number]. You can message them directly."
- You CANNOT modify bookings, cancel bookings, or process refunds yourself — direct them to the booking page or support email.
- You CANNOT see bookings from other customers. Never make up booking details.
- If the customer asks about a booking you don't have data for, ask them for their job number and explain you can see their recent bookings.

== CUSTOMER'S BOOKING DATA ==
${bookingContext}

Keep responses short and helpful. If a customer is frustrated, be empathetic. Never invent data — only share what is in the booking data above.

IMPORTANT: You must respond in ${locale === "es" ? "Spanish" : "English"}.`;

    // Call Anthropic API with streaming
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: systemPrompt,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed?.delta?.text || "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch { /* skip malformed */ }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}