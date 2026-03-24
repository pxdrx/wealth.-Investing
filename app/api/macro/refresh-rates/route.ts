// app/api/macro/refresh-rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { fetchCentralBankRates } from "@/lib/macro/rates-fetcher";
import { fetchRatesViaApify } from "@/lib/macro/apify/rates-scraper";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Auth: Bearer token (user must be logged in)
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userSupabase = createSupabaseClientForUser(token);
  const { data: { user } } = await userSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    let source = "hardcoded_fallback";
    let rates: Awaited<ReturnType<typeof fetchCentralBankRates>>;

    // 1. Try Apify (live data from TradingEconomics)
    const apifyRates = await fetchRatesViaApify();
    if (apifyRates && apifyRates.length > 0) {
      // Apify gives us current_rate but not last_action/next_meeting.
      // Merge with existing DB data to preserve those fields.
      const { data: dbRates } = await supabase
        .from("central_bank_rates")
        .select("bank_code, last_action, last_change_bps, last_change_date, next_meeting");

      const dbMap = new Map(
        (dbRates ?? []).map((r) => [r.bank_code, r])
      );

      rates = apifyRates.map((r) => {
        const existing = dbMap.get(r.bank_code);
        return {
          ...r,
          last_action: existing?.last_action ?? r.last_action,
          last_change_bps: existing?.last_change_bps ?? r.last_change_bps,
          last_change_date: existing?.last_change_date ?? r.last_change_date,
          next_meeting: existing?.next_meeting ?? r.next_meeting,
        };
      });
      source = "apify_te";
      console.log(`[refresh-rates] Using Apify data: ${rates.length} rates`);
    } else {
      // 2. Fallback to hardcoded rates
      console.warn("[refresh-rates] Apify failed, using hardcoded fallback");
      rates = await fetchCentralBankRates();
    }

    let upserted = 0;
    for (const rate of rates) {
      const { error } = await supabase
        .from("central_bank_rates")
        .upsert(rate, { onConflict: "bank_code" });
      if (!error) upserted++;
    }

    return NextResponse.json({ ok: true, source, upserted });
  } catch (error) {
    console.error("[refresh-rates] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
