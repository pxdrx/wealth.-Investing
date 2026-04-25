// lib/macro/daily-adjustment.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDailyAdjustment } from "./narrative-generator";
import { getWeekStart } from "./constants";
import type {
  AssetImpacts,
  DailyAdjustment,
  DailyAdjustmentEvent,
  DailyAdjustmentHeadline,
  DailyAdjustmentItem,
  EconomicEvent,
  HeadlineSource,
  HeadlineTier,
  MacroHeadline,
} from "./types";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Build a tight daily-style summary from the current weekly panorama narrative.
 * Used as last-resort fallback when there are no red lines AND no previous
 * daily adjustment exists. Keeps the card non-empty while making it obvious
 * the thesis is coming from the weekly briefing.
 */
export function buildWeeklyOnlyNarrative(weekly: string): string {
  const normalized = (weekly || "").trim().replace(/\r\n/g, "\n");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const firstTwo = paragraphs.slice(0, 2).join("\n\n");
  const MAX = 600;
  const excerpt = firstTwo.length > MAX ? `${firstTwo.slice(0, MAX).trimEnd()}…` : firstTwo;
  const framing =
    "Sem eventos de alto impacto nas últimas 24h. Mantendo o panorama semanal vigente:\n\n";
  return `${framing}${excerpt}`;
}

function eventReleasedAt(e: EconomicEvent): string | null {
  if (!e.date) return null;
  return e.time ? `${e.date}T${e.time}:00` : `${e.date}T00:00:00`;
}

function toAdjustmentEvent(e: EconomicEvent): DailyAdjustmentEvent {
  return {
    kind: "event",
    event_uid: e.event_uid,
    country: e.country,
    title: e.title,
    actual: e.actual,
    forecast: e.forecast,
    previous: e.previous,
    released_at: eventReleasedAt(e),
  };
}

function toAdjustmentHeadline(h: MacroHeadline): DailyAdjustmentHeadline {
  return {
    kind: "headline",
    source: h.source as HeadlineSource,
    headline: h.headline,
    summary: h.summary,
    published_at: h.published_at,
    impact: (h.impact ?? "medium") as HeadlineTier,
  };
}

const HEADLINE_NOISE_TIERS: HeadlineTier[] = ["breaking", "high", "medium"];

export interface RunDailyAdjustmentOptions {
  source: "manual" | "cascade" | "cron";
  /** When true, skip the cooldown check (used by manual regenerate). */
  ignoreCooldown?: boolean;
  /**
   * When true (default), run the fallback chain if no red lines are found:
   *   1. return the most recent existing daily adjustment (any week), OR
   *   2. synthesize a weekly-only adjustment from the current panorama narrative.
   * Cron cascades pass `false` to avoid spamming weekly_fallback rows hourly.
   */
  allowFallback?: boolean;
}

export interface RunDailyAdjustmentResult {
  ok: boolean;
  reason?: "no_red_lines" | "no_weekly_panorama" | "cooldown" | "error";
  adjustment?: DailyAdjustment;
  error?: string;
  /** Short PT-BR notice explaining the fallback (only set when fallback was used). */
  notice?: string;
  /** Which fallback branch returned the adjustment (undefined for fresh generations). */
  fallbackReason?: "previous" | "weekly_only";
}

/**
 * Generate a new daily adjustment and persist it.
 * Reusable from:
 *  - /api/macro/daily-adjustment/regenerate (user-initiated)
 *  - headlines-sync cron cascade (auto-triggered on backfill)
 */
export async function runDailyAdjustment(
  supabase: SupabaseClient,
  opts: RunDailyAdjustmentOptions
): Promise<RunDailyAdjustmentResult> {
  const weekStart = getWeekStart();

  // 1) Cooldown: at most one auto-generated row per hour. Manual bypasses.
  if (!opts.ignoreCooldown) {
    const { data: lastRow } = await supabase
      .from("daily_adjustments")
      .select("generated_at")
      .eq("week_start", weekStart)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRow?.generated_at) {
      const lastMs = new Date(lastRow.generated_at).getTime();
      if (Date.now() - lastMs < COOLDOWN_MS) {
        return { ok: false, reason: "cooldown" };
      }
    }
  }

  // 2) Load the current weekly panorama (source of truth for the thesis).
  const { data: panorama } = await supabase
    .from("weekly_panoramas")
    .select("narrative, asset_impacts, week_start")
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!panorama?.narrative) {
    return { ok: false, reason: "no_weekly_panorama" };
  }

  // 3) Fetch red lines: high-impact events with actuals in the last 24h.
  const twentyFourHAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("economic_events")
    .select("*")
    .eq("impact", "high")
    .not("actual", "is", null)
    .gte("updated_at", twentyFourHAgo)
    .order("date", { ascending: false })
    .order("time", { ascending: false })
    .limit(15);

  const redLines = (events || [])
    .filter((e: EconomicEvent) => e.actual && e.actual.trim().length > 0)
    .map(toAdjustmentEvent);

  // 3b) Fetch fresh headlines (last 48h, non-low impact, deduped by external_id).
  const fortyEightHAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: rawHeadlines } = await supabase
    .from("macro_headlines")
    .select("id, source, headline, summary, impact, published_at, fetched_at, external_id, author, url")
    .gte("published_at", fortyEightHAgo)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(40);

  const seenExternalIds = new Set<string>();
  const headlines: DailyAdjustmentHeadline[] = [];
  for (const raw of (rawHeadlines || []) as MacroHeadline[]) {
    const tier = (raw.impact ?? "medium") as HeadlineTier;
    if (!HEADLINE_NOISE_TIERS.includes(tier)) continue;
    const dedupeKey = raw.external_id || `${raw.source}::${raw.headline.slice(0, 80)}`;
    if (seenExternalIds.has(dedupeKey)) continue;
    seenExternalIds.add(dedupeKey);
    headlines.push(toAdjustmentHeadline(raw));
    if (headlines.length >= 12) break;
  }

  if (redLines.length === 0 && headlines.length === 0) {
    // Cron cascades opt out of fallback to avoid hourly weekly_fallback churn.
    if (opts.allowFallback === false) {
      return { ok: false, reason: "no_red_lines" };
    }

    // Fallback A: reuse the most recent existing daily adjustment (any week).
    const { data: lastAdj } = await supabase
      .from("daily_adjustments")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAdj) {
      return {
        ok: true,
        adjustment: lastAdj as DailyAdjustment,
        notice: "Sem red lines nem headlines novas — mantendo o ajuste anterior.",
        fallbackReason: "previous",
      };
    }

    // Fallback B: synthesize a weekly-only adjustment from the panorama narrative.
    const weeklyOnlyNarrative = buildWeeklyOnlyNarrative(panorama.narrative);
    const row = {
      week_start: weekStart,
      narrative: weeklyOnlyNarrative,
      based_on_events: [] as DailyAdjustmentItem[],
      asset_updates: {},
      source: "weekly_fallback",
      model: "none",
    };
    const { data: inserted, error: insertErr } = await supabase
      .from("daily_adjustments")
      .insert(row)
      .select()
      .maybeSingle();
    if (insertErr || !inserted) {
      console.error("[daily-adjustment] weekly_fallback insert failed:", insertErr);
      return { ok: false, reason: "error", error: insertErr?.message || "insert failed" };
    }
    return {
      ok: true,
      adjustment: inserted as DailyAdjustment,
      notice: "Sem red lines nem headlines novas — baseado no panorama semanal vigente.",
      fallbackReason: "weekly_only",
    };
  }

  // 4) Parse current asset bias (panorama.asset_impacts can be stringified JSONB).
  let currentAssetBias: AssetImpacts | null = null;
  if (panorama.asset_impacts) {
    try {
      currentAssetBias = typeof panorama.asset_impacts === "string"
        ? JSON.parse(panorama.asset_impacts)
        : (panorama.asset_impacts as AssetImpacts);
    } catch {
      currentAssetBias = null;
    }
  }

  // 5) Generate.
  let output: Awaited<ReturnType<typeof generateDailyAdjustment>>;
  try {
    output = await generateDailyAdjustment({
      weeklyBias: panorama.narrative,
      redLines,
      headlines,
      currentAssetBias,
    });
  } catch (err) {
    console.error("[daily-adjustment] generation failed:", err);
    return { ok: false, reason: "error", error: (err as Error).message };
  }

  // 6) Persist — tagged-union array preserves both events and headlines.
  const basedOnItems: DailyAdjustmentItem[] = [...redLines, ...headlines];
  const row = {
    week_start: weekStart,
    narrative: output.narrative,
    based_on_events: basedOnItems,
    asset_updates: output.asset_updates,
    source: opts.source,
    model: "claude-sonnet-4-6",
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("daily_adjustments")
    .insert(row)
    .select()
    .maybeSingle();

  if (insertErr || !inserted) {
    console.error("[daily-adjustment] insert failed:", insertErr);
    return { ok: false, reason: "error", error: insertErr?.message || "insert failed" };
  }

  return { ok: true, adjustment: inserted as DailyAdjustment };
}
