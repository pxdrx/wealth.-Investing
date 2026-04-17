// app/api/cron/rates-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { isAdminRequest } from "@/lib/macro/admin-trigger";
import { buildEmergencyFallback } from "@/lib/macro/rates-fetcher";
import { fetchRatesViaApify } from "@/lib/macro/apify/rates-scraper";
import { scrapeTradingEconomicsRates } from "@/lib/macro/scrapers/te-rates";
import { LATEST_DECISIONS } from "@/lib/macro/latest-decisions";
import { getNextMeeting } from "@/lib/macro/central-bank-schedule";
import { requireEnv } from "@/lib/env";
import { invalidateCache } from "@/lib/cache";
import { acquireCronLock } from "@/lib/cron-lock";
import type { CentralBankRate } from "@/lib/macro/types";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

/** Compare rates at 2 decimals to tolerate TE's float artifacts. */
function rateChanged(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null || b == null) return a !== b;
  return Math.round(a * 100) !== Math.round(b * 100);
}

type ScrapedRate = Omit<CentralBankRate, "id">;

interface DbRateRow {
  bank_code: string;
  current_rate: number | null;
  last_action: "hold" | "cut" | "hike" | null;
  last_change_bps: number | null;
  last_change_date: string | null;
  next_meeting: string | null;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let viaAdmin = false;
  if (!verifyCronAuth(req)) {
    if (await isAdminRequest(req)) {
      viaAdmin = true;
    } else {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!viaAdmin && !(await acquireCronLock("rates-sync", 180))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  const supabase = getSupabaseAdmin();

  try {
    let source = "";
    let rates: ScrapedRate[] | null = null;
    let scrapersFailed = false;

    // 1. Try direct Cheerio scrape of TE (no Apify credits needed)
    const teRates = await scrapeTradingEconomicsRates();
    if (teRates && teRates.length > 0) {
      source = "te_cheerio";
      rates = teRates;
    } else {
      // 2. Fallback to Apify RAG browser
      console.warn("[rates-sync] TE Cheerio failed, trying Apify...");
      const apifyRates = await fetchRatesViaApify();
      if (apifyRates && apifyRates.length > 0) {
        source = "apify_te";
        rates = apifyRates;
      } else {
        // 3. Both scrapers dead — do NOT pretend the hardcoded snapshot is fresh.
        scrapersFailed = true;
        console.error("[rates-sync] BOTH scrapers failed — using EMERGENCY fallback (flagged).");
      }
    }

    // Log failure to ingestion_logs so we can audit it after the fact.
    if (scrapersFailed) {
      await supabase.from("ingestion_logs").insert({
        source: "rates-sync",
        status: "error",
        items_count: 0,
        message: "all scrapers failed (TE Cheerio + Apify)",
      });

      // Write the emergency snapshot but flag every row as 'fallback' so the UI
      // knows it is stale. Never stamp last_change_date from this path.
      const fallback = buildEmergencyFallback();
      const nowDate = new Date();
      let upsertedFallback = 0;
      for (const r of fallback) {
        const override = LATEST_DECISIONS[r.bank_code];
        const currentRate = override?.current_rate_override ?? r.current_rate;
        const nextMeeting = getNextMeeting(r.bank_code, nowDate) ?? r.next_meeting ?? null;

        const { error } = await supabase
          .from("central_bank_rates")
          .upsert(
            {
              bank_code: r.bank_code,
              bank_name: r.bank_name,
              country: r.country,
              current_rate: currentRate,
              // last_action/bps/date come from LATEST_DECISIONS when available,
              // otherwise from the emergency snapshot. Flagged so the UI can
              // hide/warn.
              ...(override
                ? {
                    last_action: override.last_action,
                    last_change_bps: override.last_change_bps,
                    last_change_date: override.last_change_date,
                  }
                : {}),
              next_meeting: nextMeeting,
              source_confidence: "fallback",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "bank_code", ignoreDuplicates: true }
          );
        if (!error) upsertedFallback++;
      }

      await invalidateCache("macro:rates");
      return NextResponse.json({
        ok: false,
        error: "all scrapers failed",
        source: "fallback",
        upserted_fallback_only_for_missing: upsertedFallback,
      });
    }

    // Success path — we have fresh scraped rates.
    const scrapedRates = rates!;

    // Load existing DB state for change detection.
    const { data: dbRates } = await supabase
      .from("central_bank_rates")
      .select("bank_code, current_rate, last_action, last_change_bps, last_change_date, next_meeting");

    const dbMap = new Map<string, DbRateRow>(
      (dbRates ?? []).map((r: DbRateRow) => [r.bank_code, r])
    );

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    let upserted = 0;
    let changedCount = 0;

    for (const scraped of scrapedRates) {
      const existing = dbMap.get(scraped.bank_code);
      const changed = existing
        ? rateChanged(scraped.current_rate, existing.current_rate)
        : true;

      let last_action: "hold" | "cut" | "hike" | null;
      let last_change_bps: number | null;
      let last_change_date: string | null;

      if (changed) {
        // Use scraped-derived action/bps (from Previous column). If the scraper
        // couldn't derive them (e.g., Previous missing), preserve prior DB values.
        last_action = scraped.last_action ?? existing?.last_action ?? null;
        last_change_bps = scraped.last_change_bps ?? existing?.last_change_bps ?? null;
        // Detection moment — TE's Previous column is yesterday's rate, so a
        // change detected today IS today's decision.
        last_change_date = nowIso;
        changedCount++;
      } else {
        // No rate change — preserve existing action/bps/date, don't clobber.
        last_action = existing?.last_action ?? scraped.last_action ?? null;
        last_change_bps = existing?.last_change_bps ?? scraped.last_change_bps ?? null;
        last_change_date = existing?.last_change_date ?? null;
      }

      // LATEST_DECISIONS override: curated table is the source of truth for
      // last_action / last_change_bps / last_change_date (including holds,
      // which the scraper cannot detect because TE's "Previous" column equals
      // "current" between decisions). Also allows current_rate override
      // (ECB → DFR instead of MRO).
      const override = LATEST_DECISIONS[scraped.bank_code];
      if (override) {
        last_action = override.last_action;
        last_change_bps = override.last_change_bps;
        last_change_date = override.last_change_date;
      }

      const current_rate = override?.current_rate_override ?? scraped.current_rate;

      // Authoritative 2026 calendar takes precedence — scrapers never populate
      // next_meeting reliably.
      const next_meeting =
        getNextMeeting(scraped.bank_code, nowDate) ??
        scraped.next_meeting ??
        existing?.next_meeting ??
        null;

      const row = {
        bank_code: scraped.bank_code,
        bank_name: scraped.bank_name,
        country: scraped.country,
        current_rate,
        last_action,
        last_change_bps,
        last_change_date,
        next_meeting,
        source_confidence: "scraped" as const,
        updated_at: nowIso,
      };

      const { error } = await supabase
        .from("central_bank_rates")
        .upsert(row, { onConflict: "bank_code" });

      if (!error) upserted++;
      else console.warn(`[rates-sync] upsert failed for ${scraped.bank_code}:`, error.message);
    }

    // Invalidate Redis cache after successful sync
    await invalidateCache("macro:rates");

    return NextResponse.json({
      ok: true,
      source,
      upserted,
      changed: changedCount,
      total: scrapedRates.length,
    });
  } catch (error) {
    console.error("[rates-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
