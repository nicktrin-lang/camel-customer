import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { sendPartnerNewRequestEmail, coerceLocale } from "@/lib/email";
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

function toRad(value: number) { return (value * Math.PI) / 180; }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getBidWindowHours(db: ReturnType<typeof createServiceRoleSupabaseClient>) {
  const { data } = await db.from("portal_settings").select("value_number").eq("key","request_bid_window_hours").maybeSingle();
  const raw = Number(data?.value_number ?? 24);
  return (Number.isNaN(raw) || raw <= 0) ? 24 : raw;
}

function addHoursToNow(hours: number) {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

// currency coercion handled by shared coerceCurrency()

export async function GET(req: Request) {
  try {
    const accessToken  = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data, error } = await db
      .from("customer_requests")
      .select(`
        id, job_number, pickup_address, dropoff_address,
        pickup_at, dropoff_at, journey_duration_minutes,
        passengers, suitcases, hand_luggage, sport_equipment,
        vehicle_category_slug, vehicle_category_name,
        notes, status, created_at, expires_at, currency,
        driver_age, additional_drivers, additional_driver_ages,
        pref_transmission, pref_child_seats
      `)
      .eq("customer_user_id", customerUser.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const accessToken  = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);

    const pickup_address           = String(body?.pickup_address || "").trim();
    const pickup_lat               = body?.pickup_lat == null ? null : Number(body.pickup_lat);
    const pickup_lng               = body?.pickup_lng == null ? null : Number(body.pickup_lng);
    const dropoff_address          = String(body?.dropoff_address || "").trim();
    const dropoff_lat              = body?.dropoff_lat == null || body?.dropoff_lat === "" ? null : Number(body.dropoff_lat);
    const dropoff_lng              = body?.dropoff_lng == null || body?.dropoff_lng === "" ? null : Number(body.dropoff_lng);
    const pickup_at                = String(body?.pickup_at || "").trim();
    const dropoff_at               = String(body?.dropoff_at || "").trim();
    const journey_duration_minutes = Number(body?.journey_duration_minutes || 0);
    const passengers               = Number(body?.passengers || 0);
    const suitcases                = Number(body?.suitcases || 0);
    const hand_luggage             = Number(body?.hand_luggage || 0);
    const sport_equipment          = String(body?.sport_equipment || "none").trim() || "none";
    const vehicle_category_slug    = String(body?.vehicle_category_slug || "").trim();
    const vehicle_category_name    = String(body?.vehicle_category_name || "").trim();
    const notes                    = String(body?.notes || "").trim();
    const currency                 = coerceCurrency(body?.currency);

    // Driver age fields
    const driver_age_raw         = body?.driver_age == null ? null : Number(body.driver_age);
    const driver_age             = driver_age_raw != null && !isNaN(driver_age_raw) ? driver_age_raw : null;
    const additional_drivers     = Math.min(4, Math.max(0, Number(body?.additional_drivers || 0)));
    const additional_driver_ages = String(body?.additional_driver_ages || "").trim();

    // Vehicle preferences (informational, not part of matching)
    const pref_transmission_raw = String(body?.pref_transmission || "").trim().toLowerCase();
    const pref_transmission = (pref_transmission_raw === "automatic" || pref_transmission_raw === "manual") ? pref_transmission_raw : null;
    const cs = body?.pref_child_seats;
    const clampSeat = (v: any) => Math.min(3, Math.max(0, Number(v || 0) || 0));
    const pref_child_seats = (cs && typeof cs === "object")
      ? (() => {
          const infant = clampSeat(cs.infant), toddler = clampSeat(cs.toddler), booster = clampSeat(cs.booster);
          return (infant + toddler + booster) > 0 ? { infant, toddler, booster } : null;
        })()
      : null;

    // Validations
    if (!pickup_address)  return NextResponse.json({ error: "Pickup is required" }, { status: 400 });
    if (pickup_lat === null || pickup_lng === null) return NextResponse.json({ error: "Pickup coordinates are required" }, { status: 400 });
    if (Number.isNaN(pickup_lat) || Number.isNaN(pickup_lng)) return NextResponse.json({ error: "Pickup coordinates must be valid numbers" }, { status: 400 });
    if (!dropoff_address) return NextResponse.json({ error: "Dropoff is required" }, { status: 400 });
    if (!pickup_at)       return NextResponse.json({ error: "Pickup time is required" }, { status: 400 });
    if (!vehicle_category_slug || !vehicle_category_name) return NextResponse.json({ error: "Vehicle category is required" }, { status: 400 });
    // Minimum age 21 — most car hire companies require this
    if (driver_age !== null && driver_age < 21) return NextResponse.json({ error: "Main driver must be 21 or over" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();
    const bidWindowHours = await getBidWindowHours(db);
    const expires_at     = addHoursToNow(bidWindowHours);

    const customer_name  = String(customerUser.user_metadata?.full_name || "").trim() || String(customerUser.email || "").trim() || "Customer";
    const customer_phone = String(customerUser.user_metadata?.phone || "").trim() || null;

    const { data: requestRow, error: insertErr } = await db
      .from("customer_requests")
      .insert({
        customer_user_id: customerUser.id,
        customer_name,
        customer_email: customerUser.email || null,
        customer_phone,
        pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng,
        pickup_at,
        dropoff_at: dropoff_at || null,
        journey_duration_minutes: journey_duration_minutes || null,
        passengers, suitcases, hand_luggage,
        sport_equipment: sport_equipment !== "none" ? sport_equipment : null,
        vehicle_category_slug, vehicle_category_name,
        notes: notes || null,
        currency,
        status: "open",
        expires_at,
        driver_age,
        additional_drivers,
        additional_driver_ages: additional_driver_ages || null,
        pref_transmission,
        pref_child_seats,
      })
      .select(`id, job_number, passengers, suitcases, hand_luggage, vehicle_category_slug, pickup_lat, pickup_lng, expires_at`)
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

    const { data: fleetRows, error: fleetErr } = await db
      .from("partner_fleet")
      .select(`id, user_id, category_slug, max_passengers, max_suitcases, max_hand_luggage, is_active`)
      .eq("is_active", true);

    if (fleetErr) return NextResponse.json({ error: fleetErr.message }, { status: 400 });

    const partnerUserIds = Array.from(new Set((fleetRows||[]).map((f:any) => String(f.user_id||"")).filter(Boolean)));
    let partnerProfileMap = new Map<string, any>();

    if (partnerUserIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select(`user_id, company_name, role, base_lat, base_lng, service_radius_km, communication_locale, base_address, default_currency, vat_number`)
        .in("user_id", partnerUserIds);
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });
      partnerProfileMap = new Map((profileRows||[]).map((r:any) => [String(r.user_id), r]));
    }

    const eligiblePartners = new Map<string, { fleet_id: string|null; distance_km: number|null }>();

    for (const fleet of fleetRows||[]) {
      if (String(fleet.category_slug||"") !== String(requestRow.vehicle_category_slug||"")) continue;
      if (Number(fleet.max_passengers||0) < Number(requestRow.passengers||0)) continue;
      if (Number(fleet.max_suitcases||0)  < Number(requestRow.suitcases||0))  continue;
      if (Number(fleet.max_hand_luggage||0) < Number(requestRow.hand_luggage||0)) continue;

      const partnerUserId = String(fleet.user_id||"");
      if (!partnerUserId) continue;
      const profile = partnerProfileMap.get(partnerUserId);
      if (!profile) continue;
      if (["admin","super_admin"].includes(String(profile.role||"partner").trim())) continue;

      const baseLat  = profile.base_lat  == null ? null : Number(profile.base_lat);
      const baseLng  = profile.base_lng  == null ? null : Number(profile.base_lng);
      const radiusKm = profile.service_radius_km == null ? null : Number(profile.service_radius_km);
      if (baseLat===null||baseLng===null||radiusKm===null||Number.isNaN(baseLat)||Number.isNaN(baseLng)||Number.isNaN(radiusKm)) continue;

      const distanceKm = haversineKm(Number(requestRow.pickup_lat), Number(requestRow.pickup_lng), baseLat, baseLng);
      if (distanceKm > radiusKm) continue;

      if (!eligiblePartners.has(partnerUserId)) {
        eligiblePartners.set(partnerUserId, { fleet_id: String(fleet.id||"")||null, distance_km: distanceKm });
      }
    }

    // ── Restrict to LIVE partners only ────────────────────────────────────
    // A partner is matchable only when their application is APPROVED and they
    // pass full live-readiness (same checks as camel-portal
    // refreshPartnerLiveStatus). "live" is COMPUTED here, never a status value.
    // Only approved, fully-onboarded partners are matched to
    // — and emailed about — a new request. partner_applications also holds the
    // partner's contact email.
    const eligibleIds = Array.from(eligiblePartners.keys());
    const liveAppMap = new Map<string, { email: string | null }>();

    if (eligibleIds.length > 0) {
      const appRes = await db
        .from("partner_applications")
        .select(`user_id, email, status`)
        .in("user_id", eligibleIds);
      if (appRes.error) return NextResponse.json({ error: appRes.error.message }, { status: 400 });

      const hasText = (v: unknown) => String(v || "").trim().length > 0;

      for (const a of appRes.data || []) {
        const uid = String(a.user_id);
        // Approved application is the gate; "live" is NOT a status value.
        if (String(a.status || "").trim().toLowerCase() !== "approved") continue;
        const profile = partnerProfileMap.get(uid);
        if (!profile) continue;
        // Live-readiness (mirrors portal computeLiveReadiness): base_address,
        // default_currency, vat_number. Active fleet-in-category, base_lat/base_lng
        // and radius are already ensured by the loop above. An active DRIVER is
        // deliberately NOT required — it's a fulfilment-time requirement (the
        // partner assigns a driver when they process a won booking), not a
        // matching gate, so a partner missing only a driver still receives bids.
        if (!hasText(profile.base_address))     continue;
        if (!hasText(profile.default_currency)) continue;
        if (!hasText(profile.vat_number))       continue;
        liveAppMap.set(uid, { email: a.email ?? null });
      }
    }

    const livePartnerIds = eligibleIds.filter((id) => liveAppMap.has(id));

    const matchRows = livePartnerIds.map((partner_user_id) => {
      const meta = eligiblePartners.get(partner_user_id)!;
      return { request_id: requestRow.id, partner_user_id, matched_fleet_id: meta.fleet_id, match_status: "open" };
    });

    if (matchRows.length > 0) {
      const { error: matchErr } = await db.from("request_partner_matches").insert(matchRows);
      if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 400 });
    }

    // ── Email live matched partners (non-blocking) ────────────────────────
    // A mail failure must never fail request creation, so each send is
    // independent and errors are swallowed/logged via allSettled.
    if (livePartnerIds.length > 0) {
      try {
        await Promise.allSettled(
          livePartnerIds.map(async (partner_user_id) => {
            const toEmail = String(liveAppMap.get(partner_user_id)?.email || "").trim();
            if (!toEmail) return;
            const profile = partnerProfileMap.get(partner_user_id);
            const locale  = coerceLocale(profile?.communication_locale);
            await sendPartnerNewRequestEmail(toEmail, {
              jobNumber:       requestRow.job_number ?? null,
              vehicleCategory: vehicle_category_name || null,
              pickupArea:      pickup_address || null,
              expiresAt:       requestRow.expires_at ?? expires_at ?? null,
              locale,
            });
          })
        );
      } catch (e: any) {
        console.error("New-request partner email batch failed:", e?.message);
      }
    }

    return NextResponse.json({
      ok: true,
      data: { id: requestRow.id, job_number: requestRow.job_number, expires_at: requestRow.expires_at, matched_partners_count: matchRows.length, bid_window_hours: bidWindowHours },
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
