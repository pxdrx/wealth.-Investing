"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { JournalTradeRow, getNetPnl } from "@/components/journal/types";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import { MetricCard } from "@/components/reports/MetricCard";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { TrendingUp, PieChart, Brain, Globe, Printer } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";
import type { AppMessageKey } from "@/lib/i18n/app";

const DrawdownChart = dynamic(() => import("@/components/reports/DrawdownChart").then(mod => mod.DrawdownChart), { ssr: false });
const PnlDistribution = dynamic(() => import("@/components/reports/PnlDistribution").then(mod => mod.PnlDistribution), { ssr: false });
const DailyPnlChart = dynamic(() => import("@/components/reports/DailyPnlChart").then(mod => mod.DailyPnlChart), { ssr: false });
const SymbolBreakdown = dynamic(() => import("@/components/reports/BreakdownCharts").then(mod => mod.SymbolBreakdown), { ssr: false });
const DirectionBreakdown = dynamic(() => import("@/components/reports/BreakdownCharts").then(mod => mod.DirectionBreakdown), { ssr: false });
const DayOfWeekBreakdown = dynamic(() => import("@/components/reports/BreakdownCharts").then(mod => mod.DayOfWeekBreakdown), { ssr: false });
const SessionBreakdown = dynamic(() => import("@/components/reports/BreakdownCharts").then(mod => mod.SessionBreakdown), { ssr: false });
const HourHeatmap = dynamic(() => import("@/components/reports/BreakdownCharts").then(mod => mod.HourHeatmap), { ssr: false });
const PsychologyAnalysis = dynamic(() => import("@/components/journal/PsychologyAnalysis").then(mod => mod.PsychologyAnalysis), { ssr: false });

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
type ReportsTabKey = "overview" | "breakdowns" | "psicologia";

const PERIOD_OPTIONS: { key: PeriodKey; labelKey: AppMessageKey }[] = [
  { key: "7d", labelKey: "reports.period.7d" },
  { key: "30d", labelKey: "reports.period.30d" },
  { key: "90d", labelKey: "reports.period.90d" },
  { key: "ytd", labelKey: "reports.period.ytd" },
  { key: "all", labelKey: "reports.period.all" },
];

const TAB_OPTIONS: { key: ReportsTabKey; labelKey: AppMessageKey; icon: React.ReactNode }[] = [
  { key: "overview", labelKey: "reports.tab.overview", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "breakdowns", labelKey: "reports.tab.breakdowns", icon: <PieChart className="w-4 h-4" /> },
  { key: "psicologia", labelKey: "reports.tab.psicologia", icon: <Brain className="w-4 h-4" /> },
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
  return trades.filter((t) => t.opened_at >= startIso);
}

export function JournalReports() {
  const t = useAppT();
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
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: session } = await safeGetSession();
      if (cancelled) return;
      if (!session?.session?.user?.id) {
        setLoading(false);
        return;
      }
      const userId = session.session.user.id;

      let query = supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, custom_tags")
        .eq("user_id", userId)
        .order("opened_at", { ascending: true })
        .limit(5000);

      if (activeAccountId) {
        query = query.eq("account_id", activeAccountId);
      }

      const queryResult = await Promise.race([
        query,
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 10_000),
        ),
      ]);
      if (cancelled) return;
      const { data, error } = queryResult as { data: JournalTradeRow[] | null; error: unknown };
      if (!error && data) {
        setTrades(data);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
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
    <div id="journal-print-root" className="space-y-6 print-surface">
      {/* [C-14] Print header — only visible when printing. */}
      <div className="hidden print:block print-header mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          wealth<span className="mx-[1px]">.</span>Investing
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {t("reports.print.title")}
        </h1>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("reports.print.generatedAt").replace("{when}", new Date().toLocaleString("pt-BR"))}
        </p>
      </div>

      {/* Controls: Period + Timezone + Sub-tabs */}
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Sub-tabs */}
          <div className="flex gap-1 rounded-full p-1 w-fit" style={{ backgroundColor: "hsl(var(--muted))" }}>
            {TAB_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTab(opt.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-colors ${
                  tab === opt.key
                    ? "bg-white dark:bg-zinc-800 shadow-sm"
                    : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
                }`}
              >
                {opt.icon}
                {t(opt.labelKey)}
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
                  {t(opt.labelKey)}
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
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              title={t("reports.exportPdf.title")}
            >
              <Printer className="h-3.5 w-3.5" />
              {t("reports.export-pdf")}
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("reports.tradesAnalyzed").replace("{count}", String(analytics.totalTrades))}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-[22px] p-10 text-center isolate"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("reports.empty")}</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div>
                <h3 className="text-sm font-semibold">{t("reports.section.metrics")}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t("reports.section.metricsHint")}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label={t("reports.kpi.netPnl")} value={analytics.netPnl} format="currency" colorize />
                <MetricCard label={t("reports.kpi.winRate")} value={analytics.winRate} format="percent" />
                <MetricCard label={t("reports.kpi.profitFactor")} value={analytics.profitFactor === Infinity ? null : analytics.profitFactor} format="ratio" description={analytics.profitFactor === Infinity ? t("reports.kpi.profitFactorNoLoss") : undefined} />
                <MetricCard label={t("reports.kpi.expectancy")} value={analytics.expectancy} format="currency" colorize />
                <MetricCard label={t("reports.kpi.avgWin")} value={analytics.avgWin} format="currency" />
                <MetricCard label={t("reports.kpi.avgLoss")} value={-analytics.avgLoss} format="currency" colorize />
                <MetricCard label={t("reports.kpi.payoffRatio")} value={analytics.payoffRatio} format="ratio" />
                <MetricCard label={t("reports.kpi.maxDrawdown")} value={-analytics.maxDrawdown} format="percent" colorize />
                <MetricCard label={t("reports.kpi.bestDay")} value={analytics.bestDay?.pnl ?? null} format="currency" colorize description={analytics.bestDay?.date} />
                <MetricCard label={t("reports.kpi.worstDay")} value={analytics.worstDay?.pnl ?? null} format="currency" colorize description={analytics.worstDay?.date} />
                <MetricCard label={t("reports.kpi.avgDuration")} value={analytics.avgTradeDuration} format="duration" />
                <MetricCard label={t("reports.kpi.tradesPerWeek")} value={analytics.tradesPerWeek} format="number" />
              </div>

              {/* Streaks */}
              <div>
                <h3 className="text-sm font-semibold">{t("reports.section.streaks")}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t("reports.section.streaksHint")}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label={t("reports.kpi.streakCurrent")} value={analytics.streaks.current} format="number" colorize />
                <MetricCard label={t("reports.kpi.streakWins")} value={analytics.streaks.longestWin} format="number" />
                <MetricCard label={t("reports.kpi.streakLosses")} value={-analytics.streaks.longestLoss} format="number" colorize />
              </div>

              {/* Charts */}
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

          {/* Psychology Tab — Ultra only */}
          {tab === "psicologia" && (
            <PaywallGate requiredPlan="ultra" blurContent>
              <PsychologyAnalysis accountId={activeAccountId} />
            </PaywallGate>
          )}
        </>
      )}
    </div>
  );
}
