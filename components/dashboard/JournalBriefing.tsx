"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import type { TradeRow } from "@/components/calendar/types";
import {
  aggregateByDay,
  calculateStreak,
  formatPnl,
} from "@/components/calendar/utils";

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
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Filter trades by selected account
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
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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

    // Calculate avg win/loss from filtered trades
    for (const t of filteredTrades) {
      const dateKey = t.opened_at.slice(0, 10);
      if (!dateKey.startsWith(prefix)) continue;
      if (t.net_pnl_usd > 0) winSum += t.net_pnl_usd;
      if (t.net_pnl_usd < 0) lossSum += Math.abs(t.net_pnl_usd);
    }

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

  const recentTrades = useMemo(() => {
    return [...filteredTrades]
      .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
      .slice(0, 5);
  }, [filteredTrades]);

  const selectedAccountName = selectedAccountId
    ? accounts?.find((a) => a.id === selectedAccountId)?.name ?? "Conta"
    : "Todas as contas";

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      {/* Header with account selector */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Resumo de Performance
        </h3>
        <select
          value={selectedAccountId ?? ""}
          onChange={(e) => setSelectedAccountId(e.target.value || null)}
          className="text-xs font-medium rounded-lg border px-2.5 py-1.5 bg-transparent text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <option value="">Todas as contas</option>
          {accounts?.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3-section body */}
      <div className="flex flex-col lg:flex-row">
        {/* Section A — Performance Pulse */}
        <div className="flex-[4] p-5">
          <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Performance Mensal — {selectedAccountName}
          </p>

          {/* Large P&L */}
          <p
            className="text-2xl font-bold tabular-nums mb-4"
            style={{ color: pnlColor(kpis.totalPnl) }}
          >
            {formatPnl(kpis.totalPnl)}
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
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
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {(kpis.winRate * 100).toFixed(0)}%
                </span>
              </div>
            </KpiRow>

            <KpiRow label="Payoff">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {kpis.payoff}
              </span>
            </KpiRow>

            <KpiRow label="Expectativa">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: pnlColor(kpis.expectativaRaw) }}
              >
                {kpis.expectativa}
              </span>
            </KpiRow>

            <KpiRow label="Melhor Trade">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: kpis.bestTrade > 0 ? "hsl(var(--pnl-positive))" : undefined }}
              >
                {formatPnl(kpis.bestTrade)}
              </span>
            </KpiRow>

            <KpiRow label="Pior Trade">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: kpis.worstTrade < 0 ? "hsl(var(--pnl-negative))" : undefined }}
              >
                {formatPnl(kpis.worstTrade)}
              </span>
            </KpiRow>

            <KpiRow label="Dias Op.">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {kpis.daysOp}/{kpis.daysInMonth}
              </span>
            </KpiRow>

            <KpiRow label="Streak">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: streak.type === "W" ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" }}
              >
                {streak.count}{streak.type}
              </span>
            </KpiRow>

            <KpiRow label="Total Trades">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {kpis.totalTrades}
              </span>
            </KpiRow>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        <div className="lg:hidden h-px" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Section B — Equity Sparkline */}
        <div className="flex-[3] p-5 flex flex-col">
          <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Curva de Equity (30d)
          </p>

          {equityData.length >= 2 ? (
            <>
              <div className="flex-1 min-h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--pnl-positive))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--pnl-positive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--pnl-positive))"
                      strokeWidth={1.5}
                      fill="url(#equityGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {formatPnl(equityData[0].value)}
                </span>
                <span
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: "hsl(var(--pnl-positive))" }}
                >
                  {formatPnl(equityData[equityData.length - 1].value)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Dados insuficientes</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        <div className="lg:hidden h-px" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Section C — Recent Activity */}
        <div className="flex-[3] p-5">
          <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Últimas Trades
          </p>

          {recentTrades.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {recentTrades.map((t) => {
                const isLong = t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long";
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                    style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
                  >
                    {/* Direction badge */}
                    <span
                      className="inline-flex items-center justify-center rounded-md w-5 h-5 text-[9px] font-bold"
                      style={{
                        backgroundColor: isLong
                          ? "hsl(var(--pnl-positive) / 0.15)"
                          : "hsl(var(--pnl-negative) / 0.15)",
                        color: isLong ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))",
                      }}
                    >
                      {isLong ? "\u25B2" : "\u25BC"}
                    </span>

                    {/* Symbol */}
                    <span className="text-xs font-medium text-foreground flex-1 truncate">
                      {t.symbol}
                    </span>

                    {/* P&L */}
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: pnlColor(t.net_pnl_usd) }}
                    >
                      {formatPnl(t.net_pnl_usd)}
                    </span>

                    {/* Time ago */}
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(t.opened_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-muted-foreground">Nenhuma trade registrada.</span>
            </div>
          )}
        </div>
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
