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
      .slice(0, 5);
  }, [filteredTrades]);

  const selectedAccountName = selectedAccountId
    ? accounts?.find((a) => a.id === selectedAccountId)?.name ?? "Conta"
    : "Todas as contas";

  const v = (val: string) => mask(val);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      {/* Header */}
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

      {/* Top: KPIs + Equity side by side */}
      <div className="flex flex-col lg:flex-row">
        {/* KPIs */}
        <div className="flex-[4] p-5">
          <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Performance Mensal — {selectedAccountName}
          </p>

          <p
            className="text-2xl font-bold tabular-nums mb-4"
            style={{ color: pnlColor(kpis.totalPnl) }}
          >
            {v(formatPnl(kpis.totalPnl))}
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
                  {v(`${(kpis.winRate * 100).toFixed(0)}%`)}
                </span>
              </div>
            </KpiRow>

            <KpiRow label="Payoff">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {v(kpis.payoff)}
              </span>
            </KpiRow>

            <KpiRow label="Expectativa">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: pnlColor(kpis.expectativaRaw) }}
              >
                {v(kpis.expectativa)}
              </span>
            </KpiRow>

            <KpiRow label="Melhor Trade">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: kpis.bestTrade > 0 ? "hsl(var(--pnl-positive))" : undefined }}
              >
                {v(formatPnl(kpis.bestTrade))}
              </span>
            </KpiRow>

            <KpiRow label="Pior Trade">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: kpis.worstTrade < 0 ? "hsl(var(--pnl-negative))" : undefined }}
              >
                {v(formatPnl(kpis.worstTrade))}
              </span>
            </KpiRow>

            <KpiRow label="Dias Op.">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {v(`${kpis.daysOp}/${kpis.daysInMonth}`)}
              </span>
            </KpiRow>

            <KpiRow label="Streak">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: streak.type === "W" ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" }}
              >
                {v(`${streak.count}${streak.type}`)}
              </span>
            </KpiRow>

            <KpiRow label="Total Trades">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {v(kpis.totalTrades.toString())}
              </span>
            </KpiRow>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        <div className="lg:hidden h-px" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Equity Chart — expanded */}
        <div className="flex-[5] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground">
              Curva de Equity (30d)
            </p>
            {equityData.length >= 2 && (
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: pnlColor(equityData[equityData.length - 1]?.value ?? 0) }}
              >
                {v(formatPnl(equityData[equityData.length - 1]?.value ?? 0))}
              </span>
            )}
          </div>

          {equityData.length >= 2 ? (
            <div className="flex-1 min-h-[160px]">
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
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      padding: "6px 10px",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "10px" }}
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
                    strokeWidth={1.5}
                    fill="url(#equityFillSplit)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 1.5, fill: "hsl(var(--card))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[160px]">
              <span className="text-xs text-muted-foreground">Dados insuficientes</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Recent trades */}
      <div
        className="border-t px-5 py-4"
        style={{ borderColor: "hsl(var(--border))" }}
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
                  className="flex items-center gap-2 rounded-lg px-3 py-2 min-w-[140px] flex-1"
                  style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-md w-5 h-5 text-[9px] font-bold shrink-0"
                    style={{
                      backgroundColor: isLong
                        ? "hsl(var(--pnl-positive) / 0.12)"
                        : "hsl(var(--pnl-negative) / 0.12)",
                      color: isLong ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))",
                    }}
                  >
                    {isLong ? "\u25B2" : "\u25BC"}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium text-foreground truncate">
                      {t.symbol}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(t.opened_at)}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums ml-auto"
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
