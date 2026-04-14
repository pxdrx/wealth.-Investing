// ── Smart Alerts Engine ──────────────────────────────────────────
// Pure function library — no React, no hooks.
// Analyzes trades and returns preventive alerts (PT-BR).

export interface SmartAlert {
  id: string;
  type: "streak" | "toxic_asset" | "bad_hours" | "drawdown" | "overtrading";
  severity: "warning" | "danger";
  title: string;
  message: string;
  icon: string; // lucide icon name
  /**
   * Stable fingerprint of the underlying problem state.
   * Two alerts with the same (id, signature) represent the same incident;
   * when the signature changes, the alert should re-surface even if the
   * user previously dismissed a prior version.
   */
  signature: string;
}

export interface TradeInput {
  net_pnl_usd: number;
  opened_at: string;
  symbol?: string;
  account_id?: string;
}

export interface AlertContext {
  trades: TradeInput[];
  dailyDdLimit?: number | null;
  currentDayPnl?: number;
}

// ── Helpers ─────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(dateStr: string): boolean {
  return dateStr.startsWith(todayStr());
}

function getHourBucket(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  // 2h windows
  const bucketStart = Math.floor(h / 2) * 2;
  const bucketEnd = bucketStart + 2;
  return `${String(bucketStart).padStart(2, "0")}:00–${String(bucketEnd).padStart(2, "0")}:00`;
}

function dayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** yyyymmdd (no separators) for local date. */
function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO-8601 week string: "YYYY-Www" (e.g. "2026-W15"). */
function isoWeek(d: Date): string {
  // Copy in UTC to avoid DST edge effects
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // ISO week: Monday is day 1, Sunday is 7
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// ── Analyzers ───────────────────────────────────────────────────

/** 1. Losing streak — 3+ consecutive losses today → warning, 5+ → danger */
function analyzeStreak(trades: TradeInput[]): SmartAlert | null {
  const todayTrades = trades
    .filter((t) => t.opened_at && isToday(t.opened_at))
    .sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());

  if (todayTrades.length < 3) return null;

  // Count trailing losses from the end
  let streak = 0;
  for (let i = todayTrades.length - 1; i >= 0; i--) {
    if (todayTrades[i].net_pnl_usd < 0) {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 5) {
    return {
      id: "streak-danger",
      type: "streak",
      severity: "danger",
      title: `${streak} perdas consecutivas hoje`,
      message: "Considere pausar as operações. Sequências longas de perdas indicam que o mercado pode não estar favorável ao seu setup.",
      icon: "AlertTriangle",
      signature: `streak:${streak}`,
    };
  }

  if (streak >= 3) {
    return {
      id: "streak-warning",
      type: "streak",
      severity: "warning",
      title: `${streak} perdas consecutivas hoje`,
      message: "Atenção: você está em uma sequência de perdas. Revise seu plano antes da próxima entrada.",
      icon: "AlertTriangle",
      signature: `streak:${streak}`,
    };
  }

  return null;
}

/** 2. Toxic asset — last 5 trades on same symbol all losses */
function analyzeToxicAsset(trades: TradeInput[]): SmartAlert | null {
  const bySymbol = new Map<string, TradeInput[]>();

  for (const t of trades) {
    const sym = t.symbol?.toUpperCase();
    if (!sym) continue;
    if (!bySymbol.has(sym)) bySymbol.set(sym, []);
    bySymbol.get(sym)!.push(t);
  }

  for (const [symbol, symbolTrades] of Array.from(bySymbol.entries())) {
    if (symbolTrades.length < 5) continue;

    // Sort by date desc and take last 5
    const sorted = [...symbolTrades].sort(
      (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime(),
    );
    const last5 = sorted.slice(0, 5);

    if (last5.every((t) => t.net_pnl_usd < 0)) {
      return {
        id: `toxic-${symbol}`,
        type: "toxic_asset",
        severity: "danger",
        title: `${symbol} — 5 perdas seguidas`,
        message: `Suas últimas 5 operações em ${symbol} foram todas negativas. Considere evitar este ativo por enquanto.`,
        icon: "TrendingDown",
        signature: `toxic:${symbol}:${yyyymmdd(new Date())}`,
      };
    }
  }

  return null;
}

/** 3. Bad hours — win rate < 30% in a 2h time slot with 10+ trades */
function analyzeTimePattern(trades: TradeInput[]): SmartAlert | null {
  const bucketStats = new Map<string, { wins: number; total: number }>();

  for (const t of trades) {
    if (!t.opened_at) continue;
    const bucket = getHourBucket(t.opened_at);
    if (!bucket) continue;

    if (!bucketStats.has(bucket)) bucketStats.set(bucket, { wins: 0, total: 0 });
    const s = bucketStats.get(bucket)!;
    s.total++;
    if (t.net_pnl_usd > 0) s.wins++;
  }

  let worstBucket: string | null = null;
  let worstRate = 1;

  for (const [bucket, stats] of Array.from(bucketStats.entries())) {
    if (stats.total < 10) continue;
    const rate = stats.wins / stats.total;
    if (rate < 0.3 && rate < worstRate) {
      worstRate = rate;
      worstBucket = bucket;
    }
  }

  if (worstBucket) {
    const pct = Math.round(worstRate * 100);
    return {
      id: `bad-hours-${worstBucket}`,
      type: "bad_hours",
      severity: "warning",
      title: `Win rate de ${pct}% entre ${worstBucket}`,
      message: `Seu desempenho nesse horário está muito abaixo da média. Considere evitar operar nesse período.`,
      icon: "Clock",
      signature: `time:${worstBucket}:${isoWeek(new Date())}`,
    };
  }

  return null;
}

/** 4. Drawdown — daily P&L approaching DD limit (>70% consumed) */
function analyzeDrawdown(trades: TradeInput[], dailyDdLimit?: number | null): SmartAlert | null {
  if (!dailyDdLimit || dailyDdLimit <= 0) return null;

  const todayPnl = trades
    .filter((t) => t.opened_at && isToday(t.opened_at))
    .reduce((sum, t) => sum + t.net_pnl_usd, 0);

  // dailyDdLimit is positive (e.g., 5000 for $5k limit)
  // todayPnl when negative means losses
  if (todayPnl >= 0) return null;

  const consumed = Math.abs(todayPnl) / dailyDdLimit;

  const today = yyyymmdd(new Date());

  if (consumed >= 0.9) {
    return {
      id: "drawdown-danger",
      type: "drawdown",
      severity: "danger",
      title: `${Math.round(consumed * 100)}% do limite diário consumido`,
      message: "Você está muito próximo do limite de perda diária. Pare de operar AGORA para proteger sua conta.",
      icon: "AlertTriangle",
      signature: `dd:${today}:danger`,
    };
  }

  if (consumed >= 0.7) {
    return {
      id: "drawdown-warning",
      type: "drawdown",
      severity: "warning",
      title: `${Math.round(consumed * 100)}% do limite diário consumido`,
      message: "Cuidado: a maior parte do seu limite de perda diária já foi utilizada. Reduza o risco ou pare por hoje.",
      icon: "AlertTriangle",
      signature: `dd:${today}:warning`,
    };
  }

  return null;
}

/** 5. Overtrading — today's count > 2x the 30-day daily average */
function analyzeOvertrading(trades: TradeInput[]): SmartAlert | null {
  const today = todayStr();
  const todayCount = trades.filter((t) => t.opened_at && isToday(t.opened_at)).length;

  if (todayCount < 3) return null; // Need at least some trades to be meaningful

  // Count trades per day over last 30 days (excluding today)
  const dayCounts = new Map<string, number>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const t of trades) {
    if (!t.opened_at) continue;
    const dk = dayKey(t.opened_at);
    if (dk === today) continue;
    if (new Date(t.opened_at) < thirtyDaysAgo) continue;
    dayCounts.set(dk, (dayCounts.get(dk) ?? 0) + 1);
  }

  if (dayCounts.size < 3) return null; // Need enough history

  const totalDays = dayCounts.size;
  const totalTrades = Array.from(dayCounts.values()).reduce((s, c) => s + c, 0);
  const avgPerDay = totalTrades / totalDays;

  if (avgPerDay <= 0) return null;

  const ratio = todayCount / avgPerDay;

  const todayKey = yyyymmdd(new Date());

  if (ratio >= 3) {
    return {
      id: "overtrading-danger",
      type: "overtrading",
      severity: "danger",
      title: `${todayCount} operações hoje (${ratio.toFixed(1)}x a média)`,
      message: "Você está operando muito mais do que o normal. Overtrading é uma das principais causas de prejuízo. Pare e reavalie.",
      icon: "Zap",
      signature: `over:${todayKey}:danger`,
    };
  }

  if (ratio >= 2) {
    return {
      id: "overtrading-warning",
      type: "overtrading",
      severity: "warning",
      title: `${todayCount} operações hoje (${ratio.toFixed(1)}x a média)`,
      message: "Número de operações acima do normal. Mantenha a disciplina e siga seu plano de trading.",
      icon: "Zap",
      signature: `over:${todayKey}:warning`,
    };
  }

  return null;
}

// ── Main Analyzer ───────────────────────────────────────────────

export function analyzeSmartAlerts(ctx: AlertContext): SmartAlert[] {
  const { trades, dailyDdLimit } = ctx;

  if (!trades || trades.length === 0) return [];

  // Filter to only valid trades
  const validTrades = trades.filter(
    (t) => t.opened_at && typeof t.net_pnl_usd === "number" && !isNaN(t.net_pnl_usd),
  );

  const results: (SmartAlert | null)[] = [
    analyzeStreak(validTrades),
    analyzeToxicAsset(validTrades),
    analyzeTimePattern(validTrades),
    analyzeDrawdown(validTrades, dailyDdLimit),
    analyzeOvertrading(validTrades),
  ];

  return results.filter((r): r is SmartAlert => r !== null);
}
