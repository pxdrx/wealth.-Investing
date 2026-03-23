// app/api/cron/weekly-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { scrapeTeBriefing } from "@/lib/macro/te-scraper";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Check if panorama already exists and is frozen
    const { data: existing } = await supabase
      .from("weekly_panoramas")
      .select("id, is_frozen")
      .filter("week_start", "eq", weekStart)
      .maybeSingle();

    if (existing?.is_frozen) {
      return NextResponse.json({ ok: true, message: "Week is frozen, skipping" });
    }

    // 1. Get events for this week
    const { data: events } = await supabase
      .from("economic_events")
      .select("*")
      .filter("week_start", "eq", weekStart)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    // 2. Try Apify RAG browser for full Week Ahead editorial (primary)
    let weekAheadEditorial: string | null = null;
    try {
      const { fetchWeekAheadViaApify } = await import("@/lib/macro/apify/week-ahead-fetcher");
      const apifyResult = await fetchWeekAheadViaApify();
      if (apifyResult) {
        weekAheadEditorial = apifyResult.editorial;
        console.log(`[weekly-briefing] Apify week-ahead: ${weekAheadEditorial.length} chars from ${apifyResult.publishedDate}`);
      }
    } catch (err) {
      console.warn("[weekly-briefing] Apify week-ahead failed:", err);
    }

    // 2b. Scrape enriched TE data (headlines + fallback week ahead)
    let teBriefing: Awaited<ReturnType<typeof scrapeTeBriefing>> | null = null;
    let teHeadlines: string[] | null = null;
    try {
      const enriched = await scrapeTeBriefing();
      if (enriched) {
        teBriefing = enriched;
        teHeadlines = enriched.headlines.map(h => h.title);
        // Only use TE editorial as fallback if Apify didn't get it
        if (!weekAheadEditorial) {
          weekAheadEditorial = enriched.week_ahead_editorial;
        }
      }
    } catch (err) {
      console.warn("[weekly-briefing] TE scrape failed:", err);
    }

    // 3. Generate narrative via Claude Sonnet
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
      teBriefing: teBriefing?.raw_text || null,
      teHeadlines,
      weekAheadEditorial,
      weekStart,
      weekEnd,
    });

    // 4. Upsert panorama
    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: teBriefing?.raw_text || null,
      narrative: narrative.narrative,
      regional_analysis: narrative.regional_analysis,
      market_impacts: narrative.market_impacts,
      decision_intelligence: narrative.decision_intelligence,
      sentiment: narrative.sentiment,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateErr } = await supabase
        .from("weekly_panoramas")
        .update(panoramaData)
        .eq("id", existing.id);
      if (updateErr) {
        return NextResponse.json({ ok: false, error: `Update failed: ${updateErr.message}` }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabase
        .from("weekly_panoramas")
        .insert(panoramaData);
      if (insertErr) {
        return NextResponse.json({ ok: false, error: `Insert failed: ${insertErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      eventsCount: events?.length || 0,
      hasTeBriefing: !!teBriefing,
      narrativeLength: narrative.narrative?.length || 0,
    });
  } catch (error) {
    console.error("[weekly-briefing] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
