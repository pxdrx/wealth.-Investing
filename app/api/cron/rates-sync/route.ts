// app/api/cron/rates-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { fetchCentralBankRates } from "@/lib/macro/rates-fetcher";
import { fetchRatesViaApify } from "@/lib/macro/apify/rates-scraper";
import { scrapeTradingEconomicsRates } from "@/lib/macro/scrapers/te-rates";
import { requireEnv } from "@/lib/env";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    let source = "hardcoded_fallback";
    let rates: Awaited<ReturnType<typeof fetchCentralBankRates>>;

    // 1. Try direct Cheerio scrape of TE (no Apify credits needed)
    const teRates = await scrapeTradingEconomicsRates();
    if (teRates && teRates.length > 0) {
      source = "te_cheerio";
      console.log(`[rates-sync] Using TE Cheerio scraper: ${teRates.length} rates`);
      rates = teRates;
    } else {
      // 2. Fallback to Apify RAG browser
      console.warn("[rates-sync] TE Cheerio failed, trying Apify...");
      const apifyRates = await fetchRatesViaApify();
      if (apifyRates && apifyRates.length > 0) {
        source = "apify_te";
        console.log(`[rates-sync] Using Apify data: ${apifyRates.length} rates`);
        rates = apifyRates;
      } else {
        // 3. Last resort: hardcoded fallback
        console.warn("[rates-sync] Apify also failed, using hardcoded fallback");
        rates = await fetchCentralBankRates();
      }
    }

    // Merge with existing DB data to preserve last_action, next_meeting, etc.
    const { data: dbRates } = await supabase
      .from("central_bank_rates")
      .select("bank_code, last_action, last_change_bps, last_change_date, next_meeting");

    const dbMap = new Map(
      (dbRates ?? []).map((r) => [r.bank_code, r])
    );

    const mergedRates = rates.map((r) => {
      const existing = dbMap.get(r.bank_code);
      return {
        ...r,
        last_action: r.last_action ?? existing?.last_action ?? null,
        last_change_bps: r.last_change_bps ?? existing?.last_change_bps ?? null,
        last_change_date: r.last_change_date ?? existing?.last_change_date ?? null,
        next_meeting: r.next_meeting ?? existing?.next_meeting ?? null,
      };
    });

    let upserted = 0;
    for (const rate of mergedRates) {
      const { error } = await supabase
        .from("central_bank_rates")
        .upsert(rate, { onConflict: "bank_code" });
      if (!error) upserted++;
    }

    return NextResponse.json({ ok: true, source, upserted, total: mergedRates.length });
  } catch (error) {
    console.error("[rates-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
