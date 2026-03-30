// app/api/cron/weekly-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import { fetchWeekAheadViaApify } from "@/lib/macro/apify/week-ahead-fetcher";
import { scrapeForexFactoryCalendar } from "@/lib/macro/scrapers/ff-calendar";
import { FAIRECONOMY_NEXT_WEEK_URL } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCache } from "@/lib/cache";
import type { EconomicEvent, MacroHeadline } from "@/lib/macro/types";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

/**
 * Determine target week for the briefing.
 * When cron fires on Saturday or Sunday, target NEXT week (upcoming Monday).
 * Otherwise target current week.
 */
function getTargetWeek(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend: target next Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    return { weekStart: getWeekStart(nextMonday), weekEnd: getWeekEnd(nextMonday) };
  }
  return { weekStart: getWeekStart(), weekEnd: getWeekEnd() };
}

/** Run a promise with a timeout — returns null on timeout instead of throwing */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { weekStart, weekEnd } = getTargetWeek();
    console.log(`[weekly-briefing] Generating for week ${weekStart} → ${weekEnd}`);

    // Check if panorama already exists and is frozen
    const { data: existing } = await supabase
      .from("weekly_panoramas")
      .select("id, is_frozen")
      .filter("week_start", "eq", weekStart)
      .maybeSingle();

    if (existing?.is_frozen) {
      return NextResponse.json({ ok: true, message: "Week is frozen, skipping" });
    }

    // 1. Sync next week's calendar if targeting future week (weekend run)
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (isWeekend) {
      try {
        const nextWeekEvents = await scrapeForexFactoryCalendar(FAIRECONOMY_NEXT_WEEK_URL, weekStart);
        if (nextWeekEvents.length > 0) {
          // Upsert events (ignore duplicates)
          for (let i = 0; i < nextWeekEvents.length; i += 50) {
            const batch = nextWeekEvents.slice(i, i + 50);
            const { error: batchErr } = await supabase.from("economic_events").insert(batch);
            if (batchErr && !batchErr.message.includes("duplicate key")) {
              // Try one-by-one on batch failure
              for (const evt of batch) {
                await supabase.from("economic_events").insert(evt).select().maybeSingle();
              }
            }
          }
          console.log(`[weekly-briefing] Synced ${nextWeekEvents.length} events for next week`);
        }
      } catch (err) {
        console.warn("[weekly-briefing] Next week calendar sync failed:", err);
      }
    }

    // 2. Get events for target week
    const { data: events } = await supabase
      .from("economic_events")
      .select("*")
      .filter("week_start", "eq", weekStart)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    // 3. Fetch live headlines from DB
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

    // 4. Fetch Week Ahead editorial from Trading Economics (15s timeout)
    let weekAheadEditorial: string | null = null;
    try {
      const weekAheadResult = await withTimeout(fetchWeekAheadViaApify(), 15_000);
      if (weekAheadResult?.editorial) {
        weekAheadEditorial = weekAheadResult.editorial;
        console.log(`[weekly-briefing] Week Ahead fetched: ${weekAheadEditorial.length} chars`);
      } else {
        console.log("[weekly-briefing] Week Ahead not available, proceeding without it");
      }
    } catch (err) {
      console.warn("[weekly-briefing] Week Ahead fetch failed:", err);
    }

    // 5. Generate narrative via Claude
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
      teBriefing: null,
      teHeadlines: null,
      weekAheadEditorial,
      liveHeadlines,
      weekStart,
      weekEnd,
    });

    // 6. Upsert panorama
    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: weekAheadEditorial,
      narrative: narrative.weekly_bias,
      asset_impacts: {
        ...narrative.asset_impacts,
        daily_update: narrative.daily_update,
        daily_update_at: new Date().toISOString(),
      },
      regional_analysis: null,
      market_impacts: null,
      decision_intelligence: null,
      sentiment: null,
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

    // 7. Invalidate panorama cache so frontend picks up new data immediately
    await invalidateCache("macro:panorama");

    return NextResponse.json({
      ok: true,
      weekStart,
      weekEnd,
      eventsCount: events?.length || 0,
      headlinesCount: liveHeadlines.length,
      hasWeekAhead: !!weekAheadEditorial,
      narrativeLength: narrative.weekly_bias?.length || 0,
    });
  } catch (error) {
    console.error("[weekly-briefing] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
