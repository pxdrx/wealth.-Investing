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

  // Staleness check: if newest updated_at > 48h ago, flag as stale
  const rates = data || [];
  let lastUpdated: string | null = null;
  let isStale = true;
  if (rates.length > 0) {
    lastUpdated = rates.reduce((latest: string, r: { updated_at?: string }) =>
      r.updated_at && r.updated_at > latest ? r.updated_at : latest,
      rates[0].updated_at || ""
    );
    if (lastUpdated) {
      const ageMs = Date.now() - new Date(lastUpdated).getTime();
      isStale = ageMs > 48 * 60 * 60 * 1000; // 48h
    }
  }

  return NextResponse.json({
    ok: true,
    data: rates,
    meta: { last_updated: lastUpdated, is_stale: isStale },
  });
}
