// app/api/cron/weekly-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { runDailyAdjustment } from "@/lib/macro/daily-adjustment";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import { fetchWeekAheadViaApify } from "@/lib/macro/apify/week-ahead-fetcher";
import { scrapeForexFactoryCalendar } from "@/lib/macro/scrapers/ff-calendar";
import { FAIRECONOMY_NEXT_WEEK_URL } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCache } from "@/lib/cache";
import type { EconomicEvent, MacroHeadline } from "@/lib/macro/types";
import { acquireCronLock } from "@/lib/cron-lock";

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

  // Only run on Saturday (6) or Sunday (0) in UTC. Allow manual override via ?force=1
  const utcDay = new Date().getUTCDay();
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (!force && !(await acquireCronLock("weekly-briefing"))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }
  if (!force && utcDay !== 0 && utcDay !== 6) {
    console.log("[weekly-briefing] skipped — not weekend (utcDay=", utcDay, ")");
    return NextResponse.json({ ok: true, skipped: "not_weekend", utcDay });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { weekStart, weekEnd } = getTargetWeek();
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
          // next week events synced
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
    // Daily delta now lives in `daily_adjustments`; the weekly cron writes
    // only the static thesis + per-asset bias.
    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: weekAheadEditorial,
      narrative: narrative.weekly_bias,
      asset_impacts: narrative.asset_impacts,
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

    // 8. Kick a fresh daily adjustment so the Daily card is non-empty when
    // users return Monday. Best-effort — failures don't roll back the weekly.
    let dailyKicked: boolean | string = false;
    try {
      const dailyResult = await runDailyAdjustment(supabase, {
        source: "cron",
        ignoreCooldown: true,
        allowFallback: true,
      });
      dailyKicked = dailyResult.ok ? true : `skipped:${dailyResult.reason || "unknown"}`;
    } catch (err) {
      console.warn("[weekly-briefing] daily adjustment kick failed:", err);
      dailyKicked = "error";
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      weekEnd,
      eventsCount: events?.length || 0,
      headlinesCount: liveHeadlines.length,
      hasWeekAhead: !!weekAheadEditorial,
      narrativeLength: narrative.weekly_bias?.length || 0,
      dailyKicked,
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
