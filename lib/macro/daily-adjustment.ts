// lib/macro/daily-adjustment.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDailyAdjustment } from "./narrative-generator";
import { getWeekStart } from "./constants";
import type {
  AssetImpacts,
  DailyAdjustment,
  DailyAdjustmentEvent,
  EconomicEvent,
} from "./types";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

function eventReleasedAt(e: EconomicEvent): string | null {
  if (!e.date) return null;
  return e.time ? `${e.date}T${e.time}:00` : `${e.date}T00:00:00`;
}

function toAdjustmentEvent(e: EconomicEvent): DailyAdjustmentEvent {
  return {
    event_uid: e.event_uid,
    country: e.country,
    title: e.title,
    actual: e.actual,
    forecast: e.forecast,
    previous: e.previous,
    released_at: eventReleasedAt(e),
  };
}

export interface RunDailyAdjustmentOptions {
  source: "manual" | "cascade" | "cron";
  /** When true, skip the cooldown check (used by manual regenerate). */
  ignoreCooldown?: boolean;
}

export interface RunDailyAdjustmentResult {
  ok: boolean;
  reason?: "no_red_lines" | "no_weekly_panorama" | "cooldown" | "error";
  adjustment?: DailyAdjustment;
  error?: string;
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

  if (redLines.length === 0) {
    return { ok: false, reason: "no_red_lines" };
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
      currentAssetBias,
    });
  } catch (err) {
    console.error("[daily-adjustment] generation failed:", err);
    return { ok: false, reason: "error", error: (err as Error).message };
  }

  // 6) Persist.
  const row = {
    week_start: weekStart,
    narrative: output.narrative,
    based_on_events: redLines,
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
