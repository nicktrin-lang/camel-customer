"use client";

// ── /book — pure auto-submit handler ─────────────────────────────────────────
// Customers never see a form here. This page is only reached after login/signup
// redirect (login?next=/book). It reads the draft from sessionStorage, fires
// the booking API, and redirects to /bookings/[id].
// If no draft or session exists it bounces back to the homepage.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import { coerceCurrency } from "@/lib/currency";

function calculateDurationMinutes(a: string, b: string): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  if (diff <= 0) return null;
  return Math.ceil(diff / (24 * 60 * 60 * 1000)) * 24 * 60;
}

// currency coercion handled by shared coerceCurrency()

export default function BookPage() {
  const router   = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const [error,  setError]  = useState<string | null>(null);
  const submitted = useMemo(() => ({ current: false }), []);

  useEffect(() => {
    async function trySubmit(token: string) {
      if (submitted.current) return;
      submitted.current = true;

      let draft: Record<string, any> | null = null;
      try {
        const raw = sessionStorage.getItem("camel_booking_draft");
        if (raw) draft = JSON.parse(raw);
      } catch {}

      // No draft — send back to homepage
      if (!draft) { router.replace("/"); return; }

      const {
        pickupAddress, pickupLat, pickupLng,
        dropoffAddress, dropoffLat, dropoffLng,
        pickupAt, dropoffAt, passengers, suitcases,
        vehicleSlug, sportEquipment, notes, currency,
        driverAge, additionalDrivers, additionalDriverAges,
      } = draft;

      const duration = calculateDurationMinutes(pickupAt, dropoffAt);
      const cat      = FLEET_CATEGORIES.find(c => c.slug === (vehicleSlug || FLEET_CATEGORIES[0]?.slug));

      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !pickupAt || !dropoffAt || !duration || !cat) {
        sessionStorage.removeItem("camel_booking_draft");
        router.replace("/");
        return;
      }

      // Build additional_driver_ages string from array or existing string
      let additionalDriverAgesStr = "";
      if (Array.isArray(additionalDriverAges)) {
        additionalDriverAgesStr = additionalDriverAges.filter(Boolean).join(",");
      } else if (typeof additionalDriverAges === "string") {
        additionalDriverAgesStr = additionalDriverAges;
      }

      try {
        const res = await fetch("/api/test-booking/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            pickup_address: pickupAddress, pickup_lat: pickupLat, pickup_lng: pickupLng,
            dropoff_address: dropoffAddress, dropoff_lat: dropoffLat, dropoff_lng: dropoffLng,
            pickup_at: pickupAt, dropoff_at: dropoffAt,
            journey_duration_minutes: duration,
            passengers: Number(passengers || 2),
            suitcases:  Number(suitcases  || 1),
            sport_equipment: sportEquipment && sportEquipment !== "none" ? sportEquipment : null,
            vehicle_category_slug: cat.slug, vehicle_category_name: cat.name,
            notes: notes || "",
            currency: coerceCurrency(currency),
            driver_age: driverAge ? Number(driverAge) : null,
            additional_drivers: Number(additionalDrivers || 0),
            additional_driver_ages: additionalDriverAgesStr,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to create booking.");
        sessionStorage.removeItem("camel_booking_draft");
        router.push(`/bookings/${json?.data?.id}`);
      } catch (e: any) {
        setError(e?.message || "Something went wrong. Please try again.");
        submitted.current = false;
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) { trySubmit(session.access_token); return; }
      router.replace("/login?next=/book");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) trySubmit(session.access_token);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="w-full bg-black px-4 py-2.5 flex items-center">
        <Image src="/camel-logo.png" alt="Camel Global — Meet and Greet Car Hire Spain" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#f0f0f0] px-6 py-20">
        {error ? (
          <>
            <p className="text-base font-black text-red-600">{error}</p>
            <button
              onClick={() => router.replace("/")}
              className="mt-2 bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90"
            >
              ← Back to homepage
            </button>
          </>
        ) : (
          <>
            <div className="h-10 w-10 rounded-full border-4 border-[#ff7a00] border-t-transparent animate-spin" />
            <p className="text-base font-black text-black">Submitting your booking request…</p>
            <p className="text-sm font-semibold text-black/50">Sending to local car hire partners</p>
          </>
        )}
      </div>
    </div>
  );
}