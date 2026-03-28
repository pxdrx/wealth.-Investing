// app/api/macro/rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { cached } from "@/lib/cache";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

async function fetchRatesData() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("central_bank_rates")
    .select("*")
    .order("bank_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  let rates: Awaited<ReturnType<typeof fetchRatesData>>;
  try {
    rates = await cached("macro:rates", fetchRatesData, { ttl: 600 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/rates]", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch rates data" }, { status: 500 });
  }

  // Staleness check: if newest updated_at > 48h ago, flag as stale
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
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
