// app/api/cron/weekly-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import type { EconomicEvent, MacroHeadline } from "@/lib/macro/types";

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

    // 2. Fetch live headlines from DB (no external calls — must fit in 60s)
    // Apify/TE scraping removed to avoid timeout on Vercel Hobby (60s limit)
    let liveHeadlines: MacroHeadline[] = [];
    try {
      const { data: hdl } = await supabase
        .from("macro_headlines")
        .select("*")
        .gte("fetched_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(20);
      liveHeadlines = (hdl || []) as MacroHeadline[];
    } catch (err) {
      console.warn("[weekly-briefing] Headlines fetch failed:", err);
    }

    // 3. Generate narrative via Claude Sonnet
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
      teBriefing: null,
      teHeadlines: null,
      weekAheadEditorial: null,
      liveHeadlines,
      weekStart,
      weekEnd,
    });

    // 4. Upsert panorama
    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: null,
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
      headlinesCount: liveHeadlines.length,
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
