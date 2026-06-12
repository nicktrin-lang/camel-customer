import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const customerDb = createCustomerServiceRoleSupabaseClient();
    const { data: { user }, error: authErr } = await customerDb.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data, error } = await db
      .from("customer_profiles")
      .select("full_name, phone, communication_locale, billing_address, tax_id")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || {});
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, full_name, phone, communication_locale, billing_address, tax_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    // Only include fields that were explicitly sent — never overwrite with undefined
    const upsertData: Record<string, unknown> = { user_id };
    if (full_name             !== undefined) upsertData.full_name             = full_name ?? null;
    if (phone                 !== undefined) upsertData.phone                 = phone ?? null;
    if (communication_locale  !== undefined) upsertData.communication_locale  = communication_locale;
    if (billing_address       !== undefined) upsertData.billing_address       = billing_address ?? null;
    if (tax_id                !== undefined) upsertData.tax_id                = tax_id ?? null;

    const { error } = await db
      .from("customer_profiles")
      .upsert(upsertData, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
