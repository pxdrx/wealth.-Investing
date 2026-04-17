// app/api/cron/headlines-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import {
  fetchForexLiveHeadlines,
  fetchReutersHeadlines,
} from "@/lib/macro/scrapers/rss-headlines";
import { fetchTruthSocialPosts } from "@/lib/macro/scrapers/truth-social";
import { fetchTradingEconomicsHeadlines } from "@/lib/macro/scrapers/trading-economics";
import { fetchTradingEconomicsBreaking } from "@/lib/macro/scrapers/te-breaking";
import { fetchFinancialJuiceHeadlines } from "@/lib/macro/scrapers/financial-juice";
import { filterRelevantHeadlines, getHeadlineTier } from "@/lib/macro/headline-filter";
import { translateHeadlines } from "@/lib/macro/translate";
import { getWeekStart } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCache } from "@/lib/cache";
import type { MacroHeadline } from "@/lib/macro/types";
import { acquireCronLock } from "@/lib/cron-lock";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!(await acquireCronLock("headlines-sync", 240))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  const supabase = getSupabaseAdmin();

  try {
    // 1a. TE breaking has top priority — fetch first so it lands even if
    //     the broader sync times out.
    const teBreakingResult = await Promise.allSettled([fetchTradingEconomicsBreaking()]);
    const teBreakingHeadlines =
      teBreakingResult[0].status === "fulfilled" ? (teBreakingResult[0].value ?? []) : [];
    if (teBreakingResult[0].status === "rejected") {
      console.error("[headlines-sync] TE breaking fetch failed:", teBreakingResult[0].reason);
    }

    // 1b. Remaining sources in parallel (FJ is curated — no relevance filter
    //     needed, and its scraper assigns per-item tier, so Market Moving
    //     items surface at the breaking tier alongside TE breaking).
    const [flResult, reutersResult, tsResult, teResult, fjResult] = await Promise.allSettled([
      fetchForexLiveHeadlines(),
      fetchReutersHeadlines(),
      fetchTruthSocialPosts(),
      fetchTradingEconomicsHeadlines(),
      fetchFinancialJuiceHeadlines(),
    ]);

    const flHeadlines = flResult.status === "fulfilled" ? (flResult.value ?? []) : [];
    const reutersHeadlines = reutersResult.status === "fulfilled" ? (reutersResult.value ?? []) : [];
    const tsHeadlines = tsResult.status === "fulfilled" ? (tsResult.value ?? []) : [];
    const teHeadlines = teResult.status === "fulfilled" ? (teResult.value ?? []) : [];
    const fjHeadlines = fjResult.status === "fulfilled" ? (fjResult.value ?? []) : [];

    if (flResult.status === "rejected") {
      console.error("[headlines-sync] ForexLive fetch failed:", flResult.reason);
    }
    if (reutersResult.status === "rejected") {
      console.error("[headlines-sync] Reuters fetch failed:", reutersResult.reason);
    }
    if (tsResult.status === "rejected") {
      console.error("[headlines-sync] Truth Social fetch failed:", tsResult.reason);
    }
    if (teResult.status === "rejected") {
      console.error("[headlines-sync] Trading Economics fetch failed:", teResult.reason);
    }
    if (fjResult.status === "rejected") {
      console.error("[headlines-sync] FinancialJuice fetch failed:", fjResult.reason);
    }

    // Helper: strip DB-managed fields before upsert + persist tier
    const stripDbFields = (h: MacroHeadline) => ({
      source: h.source,
      headline: h.headline,
      summary: h.summary,
      author: h.author,
      url: h.url,
      impact: h.impact,
      published_at: h.published_at,
      fetched_at: h.fetched_at,
      external_id: h.external_id,
      tier: getHeadlineTier(h),
    });

    // Filter valid headlines (must have external_id)
    const teBreakingValid = teBreakingHeadlines.filter((h) => h.external_id);
    const flValid = flHeadlines.filter((h) => h.external_id);
    const reutersValid = reutersHeadlines.filter((h) => h.external_id);
    const tsValid = tsHeadlines.filter((h) => h.external_id);
    const teValid = teHeadlines.filter((h) => h.external_id);
    const fjValid = fjHeadlines.filter((h) => h.external_id);

    // Translate all sources to PT-BR in parallel
    const [
      teBreakingTranslated,
      flTranslated,
      reutersTranslated,
      tsTranslated,
      teTranslated,
      fjTranslated,
    ] = await Promise.all([
      teBreakingValid.length > 0 ? translateHeadlines(teBreakingValid) : Promise.resolve([]),
      flValid.length > 0 ? translateHeadlines(flValid) : Promise.resolve([]),
      reutersValid.length > 0 ? translateHeadlines(reutersValid) : Promise.resolve([]),
      tsValid.length > 0 ? translateHeadlines(tsValid) : Promise.resolve([]),
      teValid.length > 0 ? translateHeadlines(teValid) : Promise.resolve([]),
      fjValid.length > 0 ? translateHeadlines(fjValid) : Promise.resolve([]),
    ]);

    // Helper: upsert a batch and return count
    const upsertBatch = async (label: string, headlines: MacroHeadline[]): Promise<number> => {
      if (headlines.length === 0) return 0;
      const rows = headlines.map(stripDbFields);
      const { error, count } = await supabase
        .from("macro_headlines")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error(`[headlines-sync] ${label} upsert error:`, error.message);
        return 0;
      }
      return count ?? headlines.length;
    };

    // 2. Upsert all sources — TE breaking + FinancialJuice first (both are
    //    editorially curated: no relevance filter, and their per-item tier
    //    already reflects Market Moving priority).
    const teBreakingCount = await upsertBatch("TE-Breaking", teBreakingTranslated);
    const fjCount = await upsertBatch("FinancialJuice", fjTranslated);
    const flCount = await upsertBatch("ForexLive", filterRelevantHeadlines(flTranslated));
    const reutersCount = await upsertBatch("Reuters", filterRelevantHeadlines(reutersTranslated));
    const tsCount = await upsertBatch("TruthSocial", tsTranslated);
    const teCount = await upsertBatch("TradingEconomics", teTranslated);

    // 3. Prune headlines older than 7 days
    const { count: pruned } = await supabase
      .from("macro_headlines")
      .delete({ count: "exact" })
      .lt("fetched_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // 4. Create adaptive alerts for breaking headlines
    const allHeadlines = [
      ...teBreakingTranslated,
      ...fjTranslated,
      ...flTranslated,
      ...reutersTranslated,
      ...tsTranslated,
      ...teTranslated,
    ];
    const breakingHeadlines = allHeadlines.filter((h) => h.impact === "breaking");
    if (breakingHeadlines.length > 0) {
      const sourceLabel = (s: string) => {
        switch (s) {
          case "truth_social": return "Truth Social";
          case "trading_economics": return "Trading Economics";
          case "te_breaking": return "Trading Economics (Breaking)";
          case "financial_juice": return "FinancialJuice (Market Moving)";
          case "forexlive": return "ForexLive";
          case "reuters": return "Reuters";
          default: return s;
        }
      };

      const alerts = breakingHeadlines.map((h) => ({
        type: "breaking" as const,
        title: h.headline.slice(0, 200),
        description: `Fonte: ${sourceLabel(h.source)}`,
        week_start: getWeekStart(),
      }));

      const { error: alertError } = await supabase
        .from("adaptive_alerts")
        .insert(alerts);

      if (alertError) {
        console.error("[headlines-sync] Alert insert error:", alertError.message);
      }
    }

    // 5. Cascade: check if we should regenerate panorama
    let cascadeTriggered = false;
    const highImpactCount = allHeadlines.filter(
      (h) => h.impact === "breaking" || h.impact === "high"
    ).length;

    if (highImpactCount >= 3) {
      try {
        const { data: lastPanorama } = await supabase
          .from("weekly_panoramas")
          .select("updated_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastUpdate = lastPanorama?.updated_at
          ? new Date(lastPanorama.updated_at)
          : new Date(0);
        const hoursSinceUpdate =
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate >= 2) {
          const { generateWeeklyNarrative } = await import(
            "@/lib/macro/narrative-generator"
          );
          const { getWeekEnd } = await import("@/lib/macro/constants");

          const weekStart = getWeekStart();
          const weekEnd = getWeekEnd(new Date(weekStart + "T12:00:00"));

          // Fetch events for context
          const { data: events } = await supabase
            .from("economic_events")
            .select("*")
            .filter("week_start", "eq", weekStart)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

          // Fetch recent headlines for context
          const { data: recentHeadlines } = await supabase
            .from("macro_headlines")
            .select("*")
            .gte(
              "fetched_at",
              new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
            )
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(20);

          const narrative = await generateWeeklyNarrative({
            events: (events || []) as import("@/lib/macro/types").EconomicEvent[],
            teBriefing: null,
            weekStart,
            weekEnd,
            liveHeadlines: (recentHeadlines || []) as import("@/lib/macro/types").MacroHeadline[],
          });

          const assetImpactsWithDaily = {
            ...narrative.asset_impacts,
            daily_update: narrative.daily_update,
            daily_update_at: new Date().toISOString(),
          };

          const panoramaData = {
            week_start: weekStart,
            week_end: weekEnd,
            narrative: narrative.weekly_bias,
            asset_impacts: assetImpactsWithDaily,
            regional_analysis: null,
            market_impacts: null,
            decision_intelligence: null,
            sentiment: null,
            updated_at: new Date().toISOString(),
          };

          // Check if panorama exists for this week
          const { data: existingPan } = await supabase
            .from("weekly_panoramas")
            .select("id, is_frozen")
            .filter("week_start", "eq", weekStart)
            .maybeSingle();

          if (existingPan && !existingPan.is_frozen) {
            await supabase
              .from("weekly_panoramas")
              .update(panoramaData)
              .eq("id", existingPan.id);
            cascadeTriggered = true;
          } else if (!existingPan) {
            await supabase.from("weekly_panoramas").insert(panoramaData);
            cascadeTriggered = true;
          }

          // cascade panorama regeneration complete
        }
      } catch (err) {
        console.error("[headlines-sync] Cascade regen failed:", err);
      }
    }

    // 6. Cascade daily adjustment — internal cooldown (1h) guards against spam.
    //    Returns early if no red lines backfilled or no weekly panorama.
    let dailyAdjustmentTriggered = false;
    try {
      const { runDailyAdjustment } = await import("@/lib/macro/daily-adjustment");
      // Cascade opts out of fallback so the cron never auto-inserts weekly_fallback rows.
      const adjResult = await runDailyAdjustment(supabase, { source: "cascade", allowFallback: false });
      dailyAdjustmentTriggered = adjResult.ok;
    } catch (err) {
      console.error("[headlines-sync] Daily adjustment cascade failed:", err);
    }

    // Invalidate Redis cache after successful sync
    await invalidateCache("macro:headlines");
    if (cascadeTriggered) {
      await invalidateCache("macro:panorama");
    }

    return NextResponse.json({
      ok: true,
      te_breaking: teBreakingCount,
      financial_juice: fjCount,
      forexlive: flCount,
      reuters: reutersCount,
      truth_social: tsCount,
      trading_economics: teCount,
      pruned: pruned ?? 0,
      cascade_triggered: cascadeTriggered,
      daily_adjustment_triggered: dailyAdjustmentTriggered,
    });
  } catch (error) {
    console.error("[headlines-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
