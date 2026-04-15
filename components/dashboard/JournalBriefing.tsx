"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  YAxis,
} from "recharts";
import type { TradeRow } from "@/components/calendar/types";
import {
  aggregateByDay,
  calculateStreak,
  formatPnl,
} from "@/components/calendar/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { toForexDateKey, toForexMonthKey } from "@/lib/trading/forex-day";
import { cn } from "@/lib/utils";

interface JournalBriefingProps {
  trades: TradeRow[];
  accounts?: { id: string; name: string }[];
}

function pnlColor(v: number): string {
  if (v > 0) return "hsl(var(--pnl-positive))";
  if (v < 0) return "hsl(var(--pnl-negative))";
  return "hsl(var(--muted-foreground))";
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d`;
}

export function JournalBriefing({ trades, accounts }: JournalBriefingProps) {
  const { mask } = usePrivacy();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const filteredTrades = useMemo(() => {
    if (!selectedAccountId) return trades;
    return trades.filter((t) => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId]);

  const dailyData = useMemo(
    () => aggregateByDay(filteredTrades, accounts),
    [filteredTrades, accounts]
  );

  const kpis = useMemo(() => {
    const now = new Date();
    // Forex-month prefix (17:00-ET rollover). Matches day.date produced by
    // aggregateByDay, which is already forex-day keyed.
    const prefix = toForexMonthKey(now.toISOString());

    let totalPnl = 0;
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;
    let daysOp = 0;
    let winSum = 0;
    let lossSum = 0;

    dailyData.forEach((day) => {
      if (!day.date.startsWith(prefix)) return;
      totalPnl += day.totalPnl;
      totalTrades += day.tradeCount;
      wins += day.wins;
      losses += day.losses;
      if (day.bestTrade > bestTrade) bestTrade = day.bestTrade;
      if (day.worstTrade < worstTrade) worstTrade = day.worstTrade;
      daysOp += 1;
    });

    for (const t of filteredTrades) {
      const dateKey = toForexDateKey(t.opened_at);
      if (!dateKey.startsWith(prefix)) continue;
      if (t.net_pnl_usd > 0) winSum += t.net_pnl_usd;
      if (t.net_pnl_usd < 0) lossSum += Math.abs(t.net_pnl_usd);
    }

    // Civil-calendar cardinality for "day N of M" — not a PnL grouping.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const avgWin = wins > 0 ? winSum / wins : 0;
    const avgLoss = losses > 0 ? lossSum / losses : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
    const expectativa = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    if (bestTrade === -Infinity) bestTrade = 0;
    if (worstTrade === Infinity) worstTrade = 0;

    return {
      totalPnl,
      winRate,
      payoff: payoff === 0 ? "0" : payoff.toFixed(2),
      expectativa: formatPnl(expectativa),
      expectativaRaw: expectativa,
      bestTrade,
      worstTrade,
      daysOp,
      daysInMonth,
      totalTrades,
    };
  }, [dailyData, filteredTrades]);

  const streak = useMemo(() => calculateStreak(dailyData), [dailyData]);

  const equityData = useMemo(() => {
    const sorted = Array.from(dailyData.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    let cumulative = 0;
    return sorted.map((d) => {
      cumulative += d.totalPnl;
      return { date: d.date, value: cumulative };
    });
  }, [dailyData]);

  // Calculate the gradient split offset (0-1) for the zero line
  const gradientOffset = useMemo(() => {
    if (equityData.length === 0) return 0.5;
    const values = equityData.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max <= 0) return 0; // all negative
    if (min >= 0) return 1; // all positive
    return max / (max - min);
  }, [equityData]);

  const recentTrades = useMemo(() => {
    return [...filteredTrades]
      .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
      .slice(0, 8);
  }, [filteredTrades]);

  const selectedAccountName = selectedAccountId
    ? accounts?.find((a) => a.id === selectedAccountId)?.name ?? "Conta"
    : "Todas as contas";

  const v = (val: string) => mask(val);

  return (
    <div
      className="bg-card rounded-[22px] border border-border/40 shadow-sm overflow-hidden relative isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border/40">
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">
          Resumo de Performance
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedAccountId(null)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
              !selectedAccountId
                ? "bg-foreground text-background border-foreground"
                : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            Todas
          </button>
          {accounts?.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccountId(acc.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                selectedAccountId === acc.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {acc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Top: KPIs + Equity side by side */}
      <div className="flex flex-col lg:flex-row">
        {/* KPIs */}
        <div className="flex-none lg:flex-[4] p-4 sm:p-5">
          <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Performance Mensal — {selectedAccountName}
          </p>

          <p
            className="metric-value text-[28px] mb-5"
            style={{ color: pnlColor(kpis.totalPnl) }}
          >
            {v(formatPnl(kpis.totalPnl))}
          </p>

          <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2.5">
            <KpiRow label="Win Rate">
              <div className="flex items-center gap-2">
                <div
                  className="h-1.5 w-16 rounded-full overflow-hidden"
                  style={{ backgroundColor: "hsl(var(--muted))" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${kpis.winRate * 100}%`,
                      backgroundColor: "hsl(var(--pnl-positive))",
                    }}
                  />
                </div>
                <span className="metric-value text-sm text-foreground">
                  {v(`${(kpis.winRate * 100).toFixed(0)}%`)}
                </span>
              </div>
            </KpiRow>

            <KpiRow label="Payoff">
              <span className="metric-value text-sm text-foreground">
                {v(kpis.payoff)}
              </span>
            </KpiRow>

            <KpiRow label="Expectativa">
              <span
                className="metric-value text-sm"
                style={{ color: pnlColor(kpis.expectativaRaw) }}
              >
                {v(kpis.expectativa)}
              </span>
            </KpiRow>

            <KpiRow label="Melhor Trade">
              <span
                className="metric-value text-sm"
                style={{ color: kpis.bestTrade > 0 ? "hsl(var(--pnl-positive))" : undefined }}
              >
                {v(formatPnl(kpis.bestTrade))}
              </span>
            </KpiRow>

            <KpiRow label="Pior Trade">
              <span
                className="metric-value text-sm"
                style={{ color: kpis.worstTrade < 0 ? "hsl(var(--pnl-negative))" : undefined }}
              >
                {v(formatPnl(kpis.worstTrade))}
              </span>
            </KpiRow>

            <KpiRow label="Dias Op.">
              <span className="metric-value text-sm text-foreground">
                {v(`${kpis.daysOp}/${kpis.daysInMonth}`)}
              </span>
            </KpiRow>

            <KpiRow label="Streak">
              <span
                className="metric-value text-sm"
                style={{ color: streak.type === "W" ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" }}
              >
                {v(`${streak.count}${streak.type}`)}
              </span>
            </KpiRow>

            <KpiRow label="Total Trades">
              <span className="metric-value text-sm text-foreground">
                {v(kpis.totalTrades.toString())}
              </span>
            </KpiRow>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        <div className="lg:hidden h-px" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Equity Chart — expanded */}
        <div className="flex-none lg:flex-[5] p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground">
              Curva de Equity (30d)
            </p>
            {equityData.length >= 2 && (
              <span
                className="metric-value text-[15px]"
                style={{ color: pnlColor(equityData[equityData.length - 1]?.value ?? 0) }}
              >
                {v(formatPnl(equityData[equityData.length - 1]?.value ?? 0))}
              </span>
            )}
          </div>

          {equityData.length >= 2 ? (
            <div className="h-[220px] lg:h-auto lg:flex-1 lg:min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <defs>
                    <linearGradient id="equityStrokeSplit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor="hsl(var(--pnl-positive))" />
                      <stop offset={gradientOffset} stopColor="hsl(var(--pnl-positive))" />
                      <stop offset={gradientOffset} stopColor="hsl(var(--pnl-negative))" />
                      <stop offset={1} stopColor="hsl(var(--pnl-negative))" />
                    </linearGradient>
                    <linearGradient id="equityFillSplit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor="hsl(var(--pnl-positive))" stopOpacity={0.15} />
                      <stop offset={gradientOffset} stopColor="hsl(var(--pnl-positive))" stopOpacity={0.02} />
                      <stop offset={gradientOffset} stopColor="hsl(var(--pnl-negative))" stopOpacity={0.02} />
                      <stop offset={1} stopColor="hsl(var(--pnl-negative))" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 10, 10, 0.8)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      padding: "8px 12px",
                      color: "#fff",
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                    }}
                    itemStyle={{ color: "#fff", fontWeight: "600", fontFamily: "var(--font-jakarta)" }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginBottom: "4px" }}
                    formatter={(value: number) => [formatPnl(value), "P&L"]}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="url(#equityStrokeSplit)"
                    strokeWidth={2.5}
                    fill="url(#equityFillSplit)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[220px]">
              <span className="text-xs text-muted-foreground">Dados insuficientes</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Recent trades */}
      <div
        className="border-t border-border/40 px-5 py-4"
      >
        <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
          Últimas Trades
        </p>

        {recentTrades.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {recentTrades.map((t) => {
              const isLong = t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long";
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-xl border border-border/20 px-3 py-2.5 min-w-[140px] flex-1 bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm"
                >
                  <span
                    className="inline-flex items-center justify-center rounded-md w-6 h-6 text-[10px] font-bold shrink-0 shadow-sm"
                    style={{
                      backgroundColor: isLong
                        ? "hsl(var(--pnl-positive) / 0.15)"
                        : "hsl(var(--pnl-negative) / 0.15)",
                      color: isLong ? "hsl(var(--pnl-text-positive))" : "hsl(var(--pnl-text-negative))",
                    }}
                  >
                    {isLong ? "\u25B2" : "\u25BC"}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-semibold text-foreground tracking-tight truncate">
                      {t.symbol}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80">
                      {timeAgo(t.opened_at)}
                    </span>
                  </div>
                  <span
                    className="metric-value font-semibold text-sm ml-auto"
                    style={{ color: pnlColor(t.net_pnl_usd) }}
                  >
                    {v(formatPnl(t.net_pnl_usd))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma trade registrada.</p>
        )}
      </div>
    </div>
  );
}

interface KpiRowProps {
  label: string;
  children: React.ReactNode;
}

function KpiRow({ label, children }: KpiRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
