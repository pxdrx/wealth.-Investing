"use client";

import { useMemo } from "react";
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

/* ── style helpers ── */
const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
};

const sectionLabel: React.CSSProperties = {
  ...mono,
  fontSize: "8px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "hsl(var(--landing-text-muted))",
};

const kpiLabel: React.CSSProperties = {
  ...mono,
  fontSize: "9px",
  color: "hsl(var(--landing-text-muted))",
};

const kpiValue: React.CSSProperties = {
  ...mono,
  fontSize: "11px",
  fontWeight: 600,
};

const accent = "hsl(var(--landing-accent))";
const danger = "hsl(var(--landing-accent-danger, 0 70% 55%))";
const muted = "hsl(var(--landing-text-muted))";

/* ── helpers ── */
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

function pnlColor(v: number): string {
  if (v > 0) return accent;
  if (v < 0) return danger;
  return muted;
}

/* ── component ── */
export function JournalBriefing({ trades, accounts }: JournalBriefingProps) {
  const dailyData = useMemo(
    () => aggregateByDay(trades, accounts),
    [trades, accounts]
  );

  /* KPI computation scoped to current month */
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

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const avgWin = wins > 0 ? totalPnl > 0 ? totalPnl / wins : 0 : 0;
    const avgLoss = losses > 0 ? Math.abs(totalPnl < 0 ? totalPnl / losses : 0) : 0;
    const payoff = avgLoss > 0 ? (avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

    // expectativa = (winRate * avgWin) - ((1 - winRate) * avgLoss)
    const expectativa = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    if (bestTrade === -Infinity) bestTrade = 0;
    if (worstTrade === Infinity) worstTrade = 0;

    return {
      totalPnl,
      winRate,
      payoff: payoff === Infinity ? "\u221E" : payoff.toFixed(2),
      expectativa: formatPnl(expectativa),
      bestTrade,
      worstTrade,
      daysOp,
      daysInMonth,
    };
  }, [dailyData]);

  const streak = useMemo(() => calculateStreak(dailyData), [dailyData]);

  /* Equity sparkline — last 30 trading days cumulative */
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

  /* Recent trades — 5 most recent */
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
      .slice(0, 5);
  }, [trades]);

  const borderStyle = { borderColor: "hsl(var(--landing-border))" };

  return (
    <div className="landing-card overflow-hidden">
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={borderStyle}
      >
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(0 70% 55% / 0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(42 80% 55% / 0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(220 70% 55% / 0.4)" }} />
        </div>
        <span className="ml-2" style={{ ...mono, fontSize: "10px", color: muted }}>
          wealth.Investing — Intelligence Briefing
        </span>
      </div>

      {/* 3-section body */}
      <div className="flex flex-col lg:flex-row">
        {/* Section A — Performance Pulse */}
        <div className="flex-[4] p-4">
          <p style={sectionLabel} className="mb-3">PERFORMANCE PULSE</p>

          {/* Large P&L */}
          <p style={{ ...mono, fontSize: "20px", fontWeight: 700, color: pnlColor(kpis.totalPnl) }} className="mb-3">
            {formatPnl(kpis.totalPnl)}
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {/* Win Rate with mini bar */}
            <KpiRow label="Win Rate">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ width: "12px", backgroundColor: "hsl(var(--landing-border))" }}>
                  <div className="h-full rounded-full" style={{ width: `${kpis.winRate * 100}%`, backgroundColor: accent }} />
                </div>
                <span style={kpiValue}>{(kpis.winRate * 100).toFixed(0)}%</span>
              </div>
            </KpiRow>

            <KpiRow label="Payoff">
              <span style={kpiValue}>{kpis.payoff}</span>
            </KpiRow>

            <KpiRow label="Expectativa">
              <span style={{ ...kpiValue, color: pnlColor(parseFloat(kpis.expectativa.replace(/[^-\d.]/g, "") || "0")) }}>
                {kpis.expectativa}
              </span>
            </KpiRow>

            <KpiRow label="Melhor Trade">
              <span style={{ ...kpiValue, color: accent }}>{formatPnl(kpis.bestTrade)}</span>
            </KpiRow>

            <KpiRow label="Pior Trade">
              <span style={{ ...kpiValue, color: danger }}>{formatPnl(kpis.worstTrade)}</span>
            </KpiRow>

            <KpiRow label="Dias Op.">
              <span style={kpiValue}>{kpis.daysOp}/{kpis.daysInMonth}</span>
            </KpiRow>

            <KpiRow label="Streak">
              <span style={{ ...kpiValue, color: streak.type === "W" ? accent : danger }}>
                {streak.count}{streak.type}
              </span>
            </KpiRow>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "hsl(var(--landing-border))" }} />
        <div className="lg:hidden h-px" style={{ backgroundColor: "hsl(var(--landing-border))" }} />

        {/* Section B — Equity Sparkline */}
        <div className="flex-[3] p-4 flex flex-col">
          <p style={sectionLabel} className="mb-3">EQUITY (30D)</p>

          {equityData.length >= 2 ? (
            <>
              <div className="flex-1 min-h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--landing-accent))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--landing-accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--landing-accent))"
                      strokeWidth={1.5}
                      fill="url(#equityGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ ...mono, fontSize: "8px", color: muted }}>
                  {formatPnl(equityData[0].value)}
                </span>
                <span style={{ ...mono, fontSize: "8px", fontWeight: 600, color: accent }}>
                  {formatPnl(equityData[equityData.length - 1].value)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span style={{ ...mono, fontSize: "10px", color: muted }}>Dados insuficientes</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "hsl(var(--landing-border))" }} />
        <div className="lg:hidden h-px" style={{ backgroundColor: "hsl(var(--landing-border))" }} />

        {/* Section C — Recent Activity */}
        <div className="flex-[3] p-4">
          <p style={sectionLabel} className="mb-3">ULTIMAS TRADES</p>

          {recentTrades.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {recentTrades.map((t) => {
                const isLong = t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long";
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    style={{ backgroundColor: "hsl(var(--landing-tertiary, var(--landing-border)) / 0.5)" }}
                  >
                    {/* Direction badge */}
                    <span
                      className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5"
                      style={{
                        ...mono,
                        fontSize: "8px",
                        fontWeight: 600,
                        backgroundColor: isLong
                          ? "hsl(var(--landing-accent) / 0.15)"
                          : "hsl(var(--landing-accent-danger, 0 70% 55%) / 0.15)",
                        color: isLong ? accent : danger,
                      }}
                    >
                      {isLong ? "\u25B2" : "\u25BC"}
                    </span>

                    {/* Symbol */}
                    <span style={{ ...mono, fontSize: "10px", color: "hsl(var(--landing-text))" }} className="flex-1 truncate">
                      {t.symbol}
                    </span>

                    {/* P&L */}
                    <span style={{ ...mono, fontSize: "10px", fontWeight: 600, color: pnlColor(t.net_pnl_usd) }}>
                      {formatPnl(t.net_pnl_usd)}
                    </span>

                    {/* Time ago */}
                    <span style={{ ...mono, fontSize: "8px", color: muted }}>
                      {timeAgo(t.opened_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span style={{ ...mono, fontSize: "10px", color: muted }}>Nenhuma trade registrada.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── KPI row sub-component ── */
interface KpiRowProps {
  label: string;
  children: React.ReactNode;
}

function KpiRow({ label, children }: KpiRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span style={kpiLabel}>{label}</span>
      {children}
    </div>
  );
}
