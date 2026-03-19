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
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existing?.is_frozen) {
      return NextResponse.json({ ok: true, message: "Week is frozen, skipping" });
    }

    // 1. Get events for this week
    const { data: events } = await supabase
      .from("economic_events")
      .select("*")
      .eq("week_start", weekStart)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    // 2. Scrape TE briefing (optional context)
    const teBriefing = await scrapeTeBriefing();

    // 3. Generate narrative via Claude Sonnet
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
      teBriefing: teBriefing?.text_content || null,
      weekStart,
      weekEnd,
    });

    // 4. Upsert panorama
    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: teBriefing?.text_content || null,
      narrative: narrative.narrative,
      regional_analysis: narrative.regional_analysis,
      market_impacts: narrative.market_impacts,
      decision_intelligence: narrative.decision_intelligence,
      sentiment: narrative.sentiment,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from("weekly_panoramas")
        .update(panoramaData)
        .eq("id", existing.id);
    } else {
      await supabase.from("weekly_panoramas").insert(panoramaData);
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      eventsCount: events?.length || 0,
      hasTeBriefing: !!teBriefing,
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
