/**
 * GET /api/macro/sentiment/history?period=week|month
 *
 * Time-series aggregate of the `macro_sentiment` table for the Sentimento
 * Global card. Returns per-source stats (avg/min/max/stddev/samples,
 * risk-on/off pct, delta vs previous period), an overall classification,
 * a trend vs previous period, and coverageDays for the UI.
 *
 * Auth:  Bearer token → createSupabaseClientForUser.
 * Tier:  Pro / Ultra / Mentor only. Free → 402 upgrade_required.
 * Data:  Read via service role — macro_sentiment is shared reference data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Plan } from "@/lib/subscription-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Types -----------------------------------------------------------------

type SentimentSource = "crypto_fng" | "stocks_fng" | "vix";
type Overall = "risk_on" | "neutral" | "risk_off";
type Trend = "improving" | "deteriorating" | "stable";
type Period = "week" | "month";

interface HistoryRow {
  source: SentimentSource;
  value: number | null;
  captured_at: string;
}

interface SourceStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  stddev: number | null;
  samples: number;
  riskOnPct: number | null;
  riskOffPct: number | null;
  deltaAvg: number | null;
  firstAt: string | null;
  lastAt: string | null;
}

type SourceStatsMap = Record<SentimentSource, SourceStats>;

// ---- Helpers ---------------------------------------------------------------

const SOURCES: readonly SentimentSource[] = [
  "crypto_fng",
  "stocks_fng",
  "vix",
] as const;

function emptyStats(): SourceStats {
  return {
    avg: null,
    min: null,
    max: null,
    stddev: null,
    samples: 0,
    riskOnPct: null,
    riskOffPct: null,
    deltaAvg: null,
    firstAt: null,
    lastAt: null,
  };
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function aggregate(rows: HistoryRow[]): SourceStatsMap {
  const out: SourceStatsMap = {
    crypto_fng: emptyStats(),
    stocks_fng: emptyStats(),
    vix: emptyStats(),
  };

  const grouped: Record<SentimentSource, HistoryRow[]> = {
    crypto_fng: [],
    stocks_fng: [],
    vix: [],
  };

  for (const row of rows) {
    if (row.value === null || !Number.isFinite(row.value)) continue;
    grouped[row.source].push(row);
  }

  for (const src of SOURCES) {
    const items = grouped[src];
    if (items.length === 0) continue;

    const values: number[] = items.map((i) => i.value as number);
    const samples = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / samples;
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    let variance = 0;
    if (samples > 1) {
      let sq = 0;
      for (const v of values) {
        const d = v - avg;
        sq += d * d;
      }
      variance = sq / (samples - 1);
    }
    const stddev = samples > 1 ? Math.sqrt(variance) : 0;

    const riskOnCount = values.filter((v) => v > 60).length;
    const riskOffCount = values.filter((v) => v < 40).length;

    // Chronological bounds — rows arrive ordered, but guard anyway.
    let firstAt = items[0].captured_at;
    let lastAt = items[0].captured_at;
    for (const it of items) {
      if (it.captured_at < firstAt) firstAt = it.captured_at;
      if (it.captured_at > lastAt) lastAt = it.captured_at;
    }

    out[src] = {
      avg: round2(avg),
      min: round2(min),
      max: round2(max),
      stddev: round2(stddev),
      samples,
      riskOnPct: round2((riskOnCount / samples) * 100),
      riskOffPct: round2((riskOffCount / samples) * 100),
      deltaAvg: null, // filled by caller after prior-period aggregation
      firstAt,
      lastAt,
    };
  }

  return out;
}

function classifyOverall(stats: SourceStatsMap): Overall {
  const fngValues: number[] = [];
  if (stats.crypto_fng.avg !== null) fngValues.push(stats.crypto_fng.avg);
  if (stats.stocks_fng.avg !== null) fngValues.push(stats.stocks_fng.avg);
  const fngAvg =
    fngValues.length > 0
      ? fngValues.reduce((a, b) => a + b, 0) / fngValues.length
      : null;
  const vixAvg = stats.vix.avg;

  // VIX override wins either direction.
  if (vixAvg !== null && vixAvg > 25) return "risk_off";
  if (vixAvg !== null && vixAvg < 18 && fngAvg !== null && fngAvg > 60) {
    return "risk_on";
  }
  if (fngAvg !== null && fngAvg > 60) return "risk_on";
  if (fngAvg !== null && fngAvg < 40) return "risk_off";
  return "neutral";
}

function overallToOrdinal(o: Overall): number {
  return o === "risk_off" ? 0 : o === "neutral" ? 1 : 2;
}

function deriveTrend(current: Overall, prior: Overall | null): Trend {
  if (prior === null) return "stable";
  const c = overallToOrdinal(current);
  const p = overallToOrdinal(prior);
  if (c > p) return "improving";
  if (c < p) return "deteriorating";
  return "stable";
}

function coverageDays(stats: SourceStatsMap): number {
  let minFirst: number | null = null;
  let maxLast: number | null = null;
  for (const src of SOURCES) {
    const s = stats[src];
    if (s.firstAt) {
      const t = Date.parse(s.firstAt);
      if (Number.isFinite(t) && (minFirst === null || t < minFirst)) minFirst = t;
    }
    if (s.lastAt) {
      const t = Date.parse(s.lastAt);
      if (Number.isFinite(t) && (maxLast === null || t > maxLast)) maxLast = t;
    }
  }
  if (minFirst === null || maxLast === null) return 0;
  return Math.max(0, Math.round((maxLast - minFirst) / 86_400_000));
}

function hasAnySamples(stats: SourceStatsMap): boolean {
  return (
    stats.crypto_fng.samples > 0 ||
    stats.stocks_fng.samples > 0 ||
    stats.vix.samples > 0
  );
}

// ---- Route -----------------------------------------------------------------

export async function GET(req: NextRequest) {
  // 1. Validate period.
  const rawPeriod = req.nextUrl.searchParams.get("period");
  if (rawPeriod !== "week" && rawPeriod !== "month") {
    return NextResponse.json(
      { ok: false, error: "invalid_period" },
      { status: 400 },
    );
  }
  const period: Period = rawPeriod;
  const days = period === "week" ? 7 : 30;

  // 2. Auth.
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const userClient = createSupabaseClientForUser(token);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "invalid_session" },
      { status: 401 },
    );
  }

  // 3. Tier gate — Pro / Ultra / Mentor only.
  const { data: subRow } = await userClient
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  const plan: Plan = ((subRow as { plan?: Plan } | null)?.plan ?? "free") as Plan;
  if (plan === "free") {
    return NextResponse.json(
      { ok: false, error: "upgrade_required", plan },
      { status: 402 },
    );
  }

  // 4. Compute windows.
  const now = Date.now();
  const cutoffCurrent = new Date(now - days * 86_400_000).toISOString();
  const cutoffPriorStart = new Date(now - days * 2 * 86_400_000).toISOString();

  // 5. Query macro_sentiment (service role — shared reference data).
  let currentRows: HistoryRow[] = [];
  let priorRows: HistoryRow[] = [];
  try {
    const svc = createServiceRoleClient();

    const currentRes = await svc
      .from("macro_sentiment")
      .select("source, value, captured_at")
      .gt("captured_at", cutoffCurrent)
      .in("source", SOURCES as unknown as string[])
      .order("captured_at", { ascending: true });

    if (currentRes.error) throw currentRes.error;
    currentRows = (currentRes.data ?? []) as HistoryRow[];

    const priorRes = await svc
      .from("macro_sentiment")
      .select("source, value, captured_at")
      .gt("captured_at", cutoffPriorStart)
      .lte("captured_at", cutoffCurrent)
      .in("source", SOURCES as unknown as string[])
      .order("captured_at", { ascending: true });

    if (priorRes.error) throw priorRes.error;
    priorRows = (priorRes.data ?? []) as HistoryRow[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[macro/sentiment/history] db error:", err);
    return NextResponse.json(
      { ok: false, error: "db_error" },
      { status: 500 },
    );
  }

  // 6. Empty-window fallback.
  if (currentRows.length === 0) {
    return NextResponse.json({
      ok: true,
      period,
      empty: true,
      coverageDays: 0,
    });
  }

  // 7. Aggregate both windows.
  const current = aggregate(currentRows);
  const prior = aggregate(priorRows);

  // 8. Fill deltaAvg per source.
  for (const src of SOURCES) {
    const cur = current[src];
    const pri = prior[src];
    if (cur.avg !== null && pri.avg !== null) {
      cur.deltaAvg = round2(cur.avg - pri.avg);
    }
  }

  // 9. Overall + trend.
  const overall = classifyOverall(current);
  const priorOverall = hasAnySamples(prior) ? classifyOverall(prior) : null;
  const trend = deriveTrend(overall, priorOverall);

  // 10. Coverage.
  const coverage = coverageDays(current);

  return NextResponse.json({
    ok: true,
    period,
    sources: current,
    overall,
    trend,
    coverageDays: coverage,
  });
}
