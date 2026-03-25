// app/api/macro/regenerate-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeTeBriefing } from "@/lib/macro/te-scraper";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import type { EconomicEvent, MacroHeadline } from "@/lib/macro/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // 1. Get events for this week
    const { data: events } = await supabase
      .from("economic_events")
      .select("*")
      .filter("week_start", "eq", weekStart)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    // 2. Scrape enriched TE data (with 10s timeout — non-critical)
    let teBriefingRaw: string | null = null;
    let teHeadlines: string[] | null = null;
    let weekAheadEditorial: string | null = null;
    try {
      const tePromise = scrapeTeBriefing();
      const teTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000));
      const enriched = await Promise.race([tePromise, teTimeout]);
      if (enriched) {
        teBriefingRaw = enriched.raw_text;
        teHeadlines = enriched.headlines.map(h => h.title);
        weekAheadEditorial = enriched.week_ahead_editorial;
      }
    } catch (err) {
      console.warn("[regenerate-report] TE scrape failed:", err);
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

    // 3. Generate narrative via Claude
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
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
      { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
