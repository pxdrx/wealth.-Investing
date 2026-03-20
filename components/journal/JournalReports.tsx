"use client";

import { useState, useEffect, useMemo } from "react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { supabase } from "@/lib/supabase/client";
import { JournalTradeRow, getNetPnl } from "@/components/journal/types";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import { MetricCard } from "@/components/reports/MetricCard";
import { EquityCurve } from "@/components/reports/EquityCurve";
import { DrawdownChart } from "@/components/reports/DrawdownChart";
import { PnlDistribution } from "@/components/reports/PnlDistribution";
import { DailyPnlChart } from "@/components/reports/DailyPnlChart";
import {
  SymbolBreakdown,
  DirectionBreakdown,
  DayOfWeekBreakdown,
  SessionBreakdown,
  HourHeatmap,
} from "@/components/reports/BreakdownCharts";
import { MfeMaeScatter, ExitEfficiencyChart, MfeMaeDistribution } from "@/components/reports/MfeMaeScatter";
import { TrendingUp, PieChart, Brain, Target, Globe } from "lucide-react";

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

function getStoredTimezone(): string {
  if (typeof window === "undefined") return "America/Sao_Paulo";
  return localStorage.getItem("wealth-reports-timezone") || "America/Sao_Paulo";
}

type PeriodKey = "7d" | "30d" | "90d" | "ytd" | "all";
type ReportsTabKey = "overview" | "breakdowns" | "mfe-mae" | "psicologia";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "Tudo" },
];

const TAB_OPTIONS: { key: ReportsTabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Visão Geral", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "breakdowns", label: "Detalhamento", icon: <PieChart className="w-4 h-4" /> },
  { key: "mfe-mae", label: "MFE/MAE", icon: <Target className="w-4 h-4" /> },
  { key: "psicologia", label: "Psicologia", icon: <Brain className="w-4 h-4" /> },
];

function filterByPeriod(trades: JournalTradeRow[], period: PeriodKey): JournalTradeRow[] {
  if (period === "all") return trades;
  const now = new Date();
  let start: Date;
  switch (period) {
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return trades;
  }
  const startIso = start.toISOString();
  return trades.filter((t) => t.closed_at >= startIso);
}

export function JournalReports() {
  const { activeAccountId } = useActiveAccount();
  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [tab, setTab] = useState<ReportsTabKey>("overview");
  const [timeZone, setTimeZone] = useState<string>(getStoredTimezone);

  const handleTimezoneChange = (tz: string) => {
    setTimeZone(tz);
    localStorage.setItem("wealth-reports-timezone", tz);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setLoading(false);
        return;
      }
      const userId = session.session.user.id;

      let query = supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, notes, mistakes, emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating, mfe_usd, mae_usd")
        .eq("user_id", userId)
        .order("closed_at", { ascending: true });

      if (activeAccountId) {
        query = query.eq("account_id", activeAccountId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setTrades(data as JournalTradeRow[]);
      }
      setLoading(false);
    }
    load();
  }, [activeAccountId]);

  const filtered = useMemo(() => filterByPeriod(trades, period), [trades, period]);
  const analytics = useMemo(() => computeTradeAnalytics(filtered, timeZone), [filtered, timeZone]);
  const pnls = useMemo(() => filtered.map(getNetPnl), [filtered]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[22px] h-24 animate-pulse"
            style={{ backgroundColor: "hsl(var(--muted))" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls: Period + Timezone + Sub-tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Sub-tabs */}
          <div className="flex gap-1 rounded-full p-1 w-fit" style={{ backgroundColor: "hsl(var(--muted))" }}>
            {TAB_OPTIONS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-colors ${
                  tab === t.key
                    ? "bg-white dark:bg-zinc-800 shadow-sm"
                    : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Period selector + Timezone */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: "hsl(var(--muted))" }}>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    period === opt.key
                      ? "bg-white dark:bg-zinc-800 shadow-sm"
                      : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={timeZone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="text-xs font-medium rounded-full border px-2.5 py-1.5 bg-transparent text-foreground outline-none cursor-pointer"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {analytics.totalTrades} trades analisados
        </p>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-[22px] p-10 text-center isolate"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum trade encontrado para o período selecionado.</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="P&L Líquido" value={analytics.netPnl} format="currency" colorize />
                <MetricCard label="Win Rate" value={analytics.winRate} format="percent" />
                <MetricCard label="Profit Factor" value={analytics.profitFactor === Infinity ? null : analytics.profitFactor} format="ratio" description={analytics.profitFactor === Infinity ? "Sem perdas" : undefined} />
                <MetricCard label="Expectancy" value={analytics.expectancy} format="currency" colorize />
                <MetricCard label="Média Ganho" value={analytics.avgWin} format="currency" />
                <MetricCard label="Média Perda" value={-analytics.avgLoss} format="currency" colorize />
                <MetricCard label="Payoff Ratio" value={analytics.payoffRatio} format="ratio" />
                <MetricCard label="Max Drawdown" value={-analytics.maxDrawdown} format="percent" colorize />
                <MetricCard label="Melhor Dia" value={analytics.bestDay?.pnl ?? null} format="currency" colorize description={analytics.bestDay?.date} />
                <MetricCard label="Pior Dia" value={analytics.worstDay?.pnl ?? null} format="currency" colorize description={analytics.worstDay?.date} />
                <MetricCard label="Duração Média" value={analytics.avgTradeDuration} format="duration" />
                <MetricCard label="Trades/Semana" value={analytics.tradesPerWeek} format="number" />
              </div>

              {/* Streaks */}
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label="Streak Atual" value={analytics.streaks.current} format="number" colorize />
                <MetricCard label="Maior Sequência Wins" value={analytics.streaks.longestWin} format="number" />
                <MetricCard label="Maior Sequência Losses" value={-analytics.streaks.longestLoss} format="number" colorize />
              </div>

              {/* Charts */}
              <EquityCurve data={analytics.equityCurve} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DrawdownChart data={analytics.drawdownCurve} />
                <DailyPnlChart data={analytics.dailyPnl} />
              </div>
              <PnlDistribution pnls={pnls} />
            </div>
          )}

          {/* Breakdowns Tab */}
          {tab === "breakdowns" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SymbolBreakdown data={analytics.bySymbol} />
                <DirectionBreakdown data={analytics.byDirection} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DayOfWeekBreakdown data={analytics.byDayOfWeek} />
                <SessionBreakdown data={analytics.bySession} />
              </div>
              <HourHeatmap data={analytics.byHour} />
            </div>
          )}

          {/* MFE/MAE Tab */}
          {tab === "mfe-mae" && (
            <div className="space-y-6">
              {/* Metric cards */}
              {(() => {
                const withMfe = filtered.filter((t) => t.mfe_usd != null && t.mfe_usd > 0 && getNetPnl(t) > 0);
                const avgExitEff = withMfe.length > 0
                  ? withMfe.reduce((s, t) => s + (getNetPnl(t) / (t.mfe_usd ?? 1)) * 100, 0) / withMfe.length
                  : null;
                const withMae = filtered.filter((t) => t.mae_usd != null);
                const avgMae = withMae.length > 0
                  ? withMae.reduce((s, t) => s + Math.abs(t.mae_usd ?? 0), 0) / withMae.length
                  : null;
                const leftOnTable = withMfe.length > 0
                  ? withMfe.reduce((s, t) => s + ((t.mfe_usd ?? 0) - getNetPnl(t)), 0) / withMfe.length
                  : null;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard label="Eficiência de Saída" value={avgExitEff} format="percent" description="PnL / MFE (wins)" />
                    <MetricCard label="Stop Ótimo (MAE médio)" value={avgMae} format="currency" description="Baseado no MAE médio" />
                    <MetricCard label="Lucro Não Capturado" value={leftOnTable} format="currency" description="MFE - PnL (wins)" />
                  </div>
                );
              })()}

              {/* Scatter plots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MfeMaeScatter trades={filtered} type="mae-vs-pnl" />
                <MfeMaeScatter trades={filtered} type="mfe-vs-pnl" />
              </div>

              <ExitEfficiencyChart trades={filtered} />
              <MfeMaeDistribution trades={filtered} />
            </div>
          )}

          {/* Psychology Placeholder */}
          {tab === "psicologia" && (
            <div
              className="rounded-[22px] p-10 text-center isolate"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <Brain className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">Psicologia de Trading</h3>
              <p className="text-sm text-muted-foreground">
                Tags de emoção e disciplina por trade serão adicionadas em breve.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
