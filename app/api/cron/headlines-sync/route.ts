// app/api/cron/headlines-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { fetchFinancialJuiceHeadlines } from "@/lib/macro/scrapers/financial-juice";
import { fetchTruthSocialPosts } from "@/lib/macro/scrapers/truth-social";
import { fetchTradingEconomicsHeadlines } from "@/lib/macro/scrapers/trading-economics";
import { translateHeadlines } from "@/lib/macro/translate";
import { getWeekStart } from "@/lib/macro/constants";
import type { MacroHeadline } from "@/lib/macro/types";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // 1. Fetch headlines from all sources in parallel
    const [fjResult, tsResult, teResult] = await Promise.allSettled([
      fetchFinancialJuiceHeadlines(),
      fetchTruthSocialPosts(),
      fetchTradingEconomicsHeadlines(),
    ]);

    const fjHeadlines = fjResult.status === "fulfilled" ? (fjResult.value ?? []) : [];
    const tsHeadlines = tsResult.status === "fulfilled" ? (tsResult.value ?? []) : [];
    const teHeadlines = teResult.status === "fulfilled" ? (teResult.value ?? []) : [];

    if (fjResult.status === "rejected") {
      console.error("[headlines-sync] Financial Juice fetch failed:", fjResult.reason);
    }
    if (tsResult.status === "rejected") {
      console.error("[headlines-sync] Truth Social fetch failed:", tsResult.reason);
    }
    if (teResult.status === "rejected") {
      console.error("[headlines-sync] Trading Economics fetch failed:", teResult.reason);
    }

    // Helper: strip DB-managed fields before upsert
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
    });

    // Filter valid headlines (must have external_id)
    const fjValid = fjHeadlines.filter((h) => h.external_id);
    const tsValid = tsHeadlines.filter((h) => h.external_id);
    const teValid = teHeadlines.filter((h) => h.external_id);

    // Translate all sources to PT-BR in parallel
    const [fjTranslated, tsTranslated, teTranslated] = await Promise.all([
      fjValid.length > 0 ? translateHeadlines(fjValid) : Promise.resolve([]),
      tsValid.length > 0 ? translateHeadlines(tsValid) : Promise.resolve([]),
      teValid.length > 0 ? translateHeadlines(teValid) : Promise.resolve([]),
    ]);

    // 2. Upsert Financial Juice headlines
    let fjCount = 0;
    if (fjTranslated.length > 0) {
      const rows = fjTranslated.map(stripDbFields);
      const { error, count } = await supabase
        .from("macro_headlines")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error("[headlines-sync] FJ upsert error:", error.message);
      } else {
        fjCount = count ?? fjTranslated.length;
      }
    }

    // 3. Upsert Truth Social headlines
    let tsCount = 0;
    if (tsTranslated.length > 0) {
      const rows = tsTranslated.map(stripDbFields);
      const { error, count } = await supabase
        .from("macro_headlines")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error("[headlines-sync] TS upsert error:", error.message);
      } else {
        tsCount = count ?? tsTranslated.length;
      }
    }

    // 4. Upsert Trading Economics headlines
    let teCount = 0;
    if (teTranslated.length > 0) {
      const rows = teTranslated.map(stripDbFields);
      const { error, count } = await supabase
        .from("macro_headlines")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error("[headlines-sync] TE upsert error:", error.message);
      } else {
        teCount = count ?? teTranslated.length;
      }
    }

    // 5. Prune headlines older than 7 days
    const { count: pruned } = await supabase
      .from("macro_headlines")
      .delete({ count: "exact" })
      .lt("fetched_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // 6. Create adaptive alerts for breaking headlines
    const allHeadlines = [...fjTranslated, ...tsTranslated, ...teTranslated];
    const breakingHeadlines = allHeadlines.filter((h) => h.impact === "breaking");
    if (breakingHeadlines.length > 0) {
      const sourceLabel = (s: string) => {
        if (s === "truth_social") return "Truth Social";
        if (s === "trading_economics") return "Trading Economics";
        return "Financial Juice";
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

    console.log(`[headlines-sync] FJ: ${fjCount}, TS: ${tsCount}, TE: ${teCount}, pruned: ${pruned ?? 0}, breaking: ${breakingHeadlines.length}`);

    return NextResponse.json({
      ok: true,
      financial_juice: fjCount,
      truth_social: tsCount,
      trading_economics: teCount,
      pruned: pruned ?? 0,
    });
  } catch (error) {
    console.error("[headlines-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
