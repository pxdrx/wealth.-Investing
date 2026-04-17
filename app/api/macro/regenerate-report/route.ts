// app/api/macro/regenerate-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeTeBriefing } from "@/lib/macro/te-scraper";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import type { EconomicEvent, MacroHeadline } from "@/lib/macro/types";

function previousWeekStartISO(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export async function POST(req: NextRequest) {
  // Verify user auth via Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Verify the token is valid by creating a user-scoped client
  const token = authHeader.slice(7);
  const userClient = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Parse optional week parameter
    const body = await req.json().catch(() => ({}));
    const weekStart = body.week || getWeekStart();
    const weekEnd = getWeekEnd(new Date(weekStart + "T12:00:00"));

    // Rate limit: check if panorama was updated less than 5 minutes ago
    const { data: existing } = await supabase
      .from("weekly_panoramas")
      .select("id, is_frozen, updated_at")
      .filter("week_start", "eq", weekStart)
      .maybeSingle();

    if (existing?.is_frozen) {
      return NextResponse.json({ ok: false, error: "Semana congelada, não pode ser atualizada" }, { status: 409 });
    }

    if (existing?.updated_at) {
      const lastUpdate = new Date(existing.updated_at).getTime();
      const now = Date.now();
      if (now - lastUpdate < 5 * 60 * 1000) {
        return NextResponse.json({ ok: false, error: "Aguarde 5 minutos entre regenerações" }, { status: 429 });
      }
    }

    // 1. Get events for this week + last week (for recap in Sonnet prompt)
    const prevWeekStart = previousWeekStartISO(weekStart);
    const [{ data: events }, { data: prevEvents }] = await Promise.all([
      supabase
        .from("economic_events")
        .select("*")
        .filter("week_start", "eq", weekStart)
        .order("date", { ascending: true })
        .order("time", { ascending: true }),
      supabase
        .from("economic_events")
        .select("*")
        .filter("week_start", "eq", prevWeekStart)
        .eq("impact", "high")
        .not("actual", "is", null)
        .order("date", { ascending: true })
        .order("time", { ascending: true }),
    ]);

    // 2. Reuse existing TE data from DB if available (skip live scrape to stay under 60s)
    let teBriefingRaw: string | null = null;
    let teHeadlines: string[] | null = null;
    let weekAheadEditorial: string | null = null;

    // Always try fresh TE scrape first (Week Ahead updates weekly)
    try {
      const tePromise = scrapeTeBriefing();
      const teTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000));
      const enriched = await Promise.race([tePromise, teTimeout]);
      if (enriched) {
        teBriefingRaw = enriched.raw_text;
        teHeadlines = enriched.headlines.map(h => h.title);
        weekAheadEditorial = enriched.week_ahead_editorial;
      }
    } catch (err) {
      console.warn("[regenerate-report] Fresh TE scrape failed:", err);
    }

    // Fallback to cached TE data if fresh scrape failed/timed out
    if (!teBriefingRaw && existing) {
      const { data: existingFull } = await supabase
        .from("weekly_panoramas")
        .select("te_briefing_raw")
        .eq("id", existing.id)
        .maybeSingle();
      if (existingFull?.te_briefing_raw) {
        teBriefingRaw = existingFull.te_briefing_raw;
      }
    }

    // 2b. Fetch latest live headlines from DB for narrative context
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
      console.warn("[regenerate-report] Headlines fetch failed:", err);
    }

    // 3. Generate narrative via Claude (Sonnet weekly)
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
      previousWeekEvents: (prevEvents || []) as EconomicEvent[],
      teBriefing: teBriefingRaw,
      teHeadlines,
      weekAheadEditorial,
      liveHeadlines,
      weekStart,
      weekEnd,
    });

    // 4. Upsert panorama
    // Store daily_update and timestamp inside asset_impacts JSONB
    const assetImpactsWithDaily = {
      ...narrative.asset_impacts,
      daily_update: narrative.daily_update,
      daily_update_at: new Date().toISOString(),
    };

    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: teBriefingRaw,
      narrative: narrative.weekly_bias,
      asset_impacts: assetImpactsWithDaily,
      // Clear legacy fields on regeneration
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

    return NextResponse.json({
      ok: true,
      weekStart,
      eventsCount: events?.length || 0,
      hasTeData: !!teBriefingRaw,
      narrativeLength: narrative.weekly_bias?.length || 0,
    });
  } catch (error) {
    console.error("[regenerate-report] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
