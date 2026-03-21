// app/api/macro/rates/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("central_bank_rates")
    .select("*")
    .order("bank_code", { ascending: true });

  if (error) {
    console.error("[macro/rates]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch rates data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
