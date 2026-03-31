"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  Flame,
  Trophy,
  Sparkles,
  CircleDollarSign,
  Gem,
  Bitcoin,

} from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { supabase } from "@/lib/supabase/client";
import { PaywallGate } from "@/components/billing/PaywallGate";
import type { DashboardLayout } from "@/components/dashboard/WidgetRenderer";
import { formatPnl } from "@/components/calendar/utils";
import type { TradeRow, DayNote } from "@/components/calendar/types";
import type { Account } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useDashboardData, type JournalTradeKpiRow, type PropAccountRow } from "@/hooks/useDashboardData";
import { useNewsData, type NewsItem } from "@/hooks/useNewsData";
import { useLiveMonitoringSafe } from "@/components/context/LiveMonitoringContext";
import type { TradeInput } from "@/lib/smart-alerts";

// ── Dynamic imports for heavy components (perf: code-split) ──
const CalendarPnl = dynamic(
  () => import("@/components/calendar/CalendarPnl").then((m) => ({ default: m.CalendarPnl })),
  { ssr: false, loading: () => <div className="h-[320px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const JournalBriefing = dynamic(
  () => import("@/components/dashboard/JournalBriefing").then((m) => ({ default: m.JournalBriefing })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const AccountsOverview = dynamic(
  () => import("@/components/dashboard/AccountsOverview").then((m) => ({ default: m.AccountsOverview })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const BacktestSection = dynamic(
  () => import("@/components/dashboard/BacktestSection").then((m) => ({ default: m.BacktestSection })),
  { ssr: false },
);
const SessionHeatmap = dynamic(
  () => import("@/components/dashboard/SessionHeatmap").then((m) => ({ default: m.SessionHeatmap })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const WidgetRenderer = dynamic(
  () => import("@/components/dashboard/WidgetRenderer").then((m) => ({ default: m.WidgetRenderer })),
  { ssr: false, loading: () => <div className="h-[400px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const MacroWidgetBriefing = dynamic(
  () => import("@/components/macro/MacroWidgetBriefing").then((m) => ({ default: m.MacroWidgetBriefing })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const MacroWidgetEvents = dynamic(
  () => import("@/components/macro/MacroWidgetEvents").then((m) => ({ default: m.MacroWidgetEvents })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const SmartAlertsBanner = dynamic(
  () => import("@/components/dashboard/SmartAlertsBanner").then((m) => ({ default: m.SmartAlertsBanner })),
  { ssr: false },
);
const LiveMonitoringWidget = dynamic(
  () => import("@/components/live/LiveMonitoringWidget").then((m) => ({ default: m.LiveMonitoringWidget })),
  { ssr: false },
);
const LiveAlertsBanner = dynamic(
  () => import("@/components/live/LiveAlertsBanner").then((m) => ({ default: m.LiveAlertsBanner })),
  { ssr: false },
);
const MonthlyPerformanceGrid = dynamic(
  () => import("@/components/dashboard/MonthlyPerformanceGrid").then((m) => ({ default: m.MonthlyPerformanceGrid })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const PerformanceCard = dynamic(
  () => import("@/components/dashboard/PerformanceCard").then((m) => ({ default: m.PerformanceCard })),
  { ssr: false, loading: () => <div className="h-[500px] w-full rounded-xl bg-muted animate-pulse" /> },
);

// Types moved to hooks/useDashboardData.ts and hooks/useNewsData.ts

const QUICK_ASSETS = [
  { label: "EUR/USD", symbol: "FX:EURUSD", icon: CircleDollarSign },
  { label: "Ouro", symbol: "TVC:GOLD", icon: Gem },
  { label: "BTC", symbol: "BITSTAMP:BTCUSD", icon: Bitcoin },
  { label: "Petróleo", symbol: "TVC:USOIL", icon: Flame },
  { label: "Brent", symbol: "TVC:UKOIL", icon: Flame },
  { label: "Nasdaq", symbol: "PEPPERSTONE:NAS100", icon: BarChart3 },
  { label: "DXY", symbol: "CAPITALCOM:DXY", icon: CircleDollarSign },
] as const;

const LIVE_REFRESH_MS = 60_000; // Auto-refresh dashboard every 60s when live

export default function DashboardPage() {
  const { activeAccountId } = useActiveAccount();
  const dashData = useDashboardData();
  const newsData = useNewsData();
  const liveMonitoring = useLiveMonitoringSafe();

  // Auto-refresh dashboard data when live-connected (every 60s)
  useEffect(() => {
    if (!liveMonitoring?.isConnected || liveMonitoring?.connectionStatus !== "connected") return;
    const interval = setInterval(() => {
      dashData.refreshData();
    }, LIVE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [liveMonitoring?.isConnected, liveMonitoring?.connectionStatus, dashData.refreshData]);

  // Lazy-load TradingView iframe via IntersectionObserver
  const watchlistRef = useRef<HTMLDivElement>(null);
  const [iframeVisible, setIframeVisible] = useState(false);

  useEffect(() => {
    const el = watchlistRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIframeVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <DashboardContent
      activeAccountId={activeAccountId}
      journalTrades={dashData.journalTrades}
      journalLoading={dashData.journalLoading || !dashData.sessionChecked}
      accountsById={dashData.accountsById}
      dayNotes={dashData.dayNotes}
      propAccounts={dashData.propAccounts}
      propPayoutsTotal={dashData.propPayoutsTotal}
      watchlistRef={watchlistRef}
      iframeVisible={iframeVisible}
      setIframeVisible={setIframeVisible}
      formattedNews={newsData.formattedNews}
      newsLoading={newsData.newsLoading}
      newsError={newsData.newsError}
      dashboardLayout={dashData.dashboardLayout}
      onRefreshData={dashData.refreshData}
      userId={dashData.userId}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <div className="h-7 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Ticker tape skeleton */}
        <div className="lg:col-span-12">
          <div className="h-[46px] w-full rounded-xl bg-muted animate-pulse" />
        </div>
        {/* Chart skeleton */}
        <div className="lg:col-span-12">
          <div className="h-[300px] w-full rounded-xl bg-muted animate-pulse" />
        </div>
        {/* Calendar skeleton */}
        <div className="lg:col-span-12">
          <div className="h-[320px] w-full rounded-xl bg-muted animate-pulse" />
        </div>
        {/* KPI cards skeleton */}
        <div className="lg:col-span-12">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-[22px] bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({
  activeAccountId,
  journalTrades,
  journalLoading,
  accountsById,
  dayNotes,
  propAccounts,
  propPayoutsTotal,
  watchlistRef,
  iframeVisible,
  setIframeVisible,
  formattedNews,
  newsLoading,
  newsError,
  dashboardLayout,
  onRefreshData,
  userId,
}: {
  activeAccountId: string | null;
  journalTrades: JournalTradeKpiRow[];
  journalLoading: boolean;
  accountsById: Map<string, Account>;
  dayNotes: Record<string, DayNote>;
  propAccounts: PropAccountRow[];
  propPayoutsTotal: number;
  watchlistRef: React.RefObject<HTMLDivElement>;
  iframeVisible: boolean;
  setIframeVisible: (v: boolean) => void;
  formattedNews: (NewsItem & { timeLabel: string })[];
  newsLoading: boolean;
  newsError: string | null;
  dashboardLayout: DashboardLayout;
  onRefreshData?: () => void;
  userId?: string | null;
}) {
  const { hidden, toggle } = usePrivacy();
  const [chartExpanded, setChartExpanded] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("FX:EURUSD");
  const [localLayout, setLocalLayout] = useState(dashboardLayout);

  // Sync with prop changes
  useEffect(() => {
    setLocalLayout(dashboardLayout);
  }, [dashboardLayout]);

  // Persist reordered layout
  const handleReorder = useCallback((newWidgets: DashboardLayout["widgets"]) => {
    const newLayout = { ...localLayout, widgets: newWidgets };
    setLocalLayout(newLayout);
    // Persist to localStorage
    if (userId) {
      try { localStorage.setItem(`wealth-dash-layout-${userId}`, JSON.stringify(newLayout)); } catch {}
      // Persist to DB in background
      supabase
        .from("profiles")
        .update({ dashboard_layout: newLayout as unknown as Record<string, unknown> })
        .eq("id", userId)
        .then(() => {});
    }
  }, [localLayout, userId]);
  const { resolvedTheme } = useTheme();
  const tvTheme = resolvedTheme === "dark" ? "dark" : "light";

  // When chart is expanded, ensure iframe is visible (fixes race with IntersectionObserver)
  const handleChartToggle = () => {
    setChartExpanded((v) => {
      if (!v) setIframeVisible(true);
      return !v;
    });
  };

  // Compute real (non-backtest) trades for Smart Alerts
  const realAccountIds = useMemo(() => {
    const ids = new Set<string>();
    Array.from(accountsById.entries()).forEach(([id, acc]) => {
      if (acc.kind !== "backtest") ids.add(id);
    });
    return ids;
  }, [accountsById]);

  const realTrades = useMemo(
    () => journalTrades.filter((t) => realAccountIds.has(t.account_id ?? "")),
    [journalTrades, realAccountIds],
  );

  const activePropAccount = useMemo(
    () => activeAccountId ? propAccounts.find((p) => p.account_id === activeAccountId) : null,
    [activeAccountId, propAccounts],
  );

  if (journalLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden" data-account-id={activeAccountId ?? undefined}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold tracking-tight text-foreground">
            Centro de Comando
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Visão geral das suas contas.
          </p>
        </div>
        <button
          onClick={toggle}
          className="group relative flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          title={hidden ? "Mostrar valores sensíveis" : "Ocultar valores sensíveis"}
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{hidden ? "Mostrar" : "Ocultar"}</span>
          <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
            {hidden ? "Mostrar valores sensíveis" : "Ocultar valores sensíveis"}
          </span>
        </button>
      </div>

      {/* Empty state for new users with 0 trades (skip for backtest accounts) */}
      {journalTrades.length === 0 && (() => {
        const activeAcc = activeAccountId ? accountsById.get(activeAccountId) : null;
        return !activeAcc || activeAcc.kind !== "backtest";
      })() && (
        <div className="mb-8 flex justify-center">
          <div
            className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed border-border/60 px-10 py-12 text-center max-w-md"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Nenhuma operação registrada
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Importe seu relatório do MT5 ou adicione trades manualmente no Trade Journal.
              </p>
            </div>
            <Link
              href="/app/journal"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Ir para o Journal
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 auto-rows-min">
        {/* TradingView Advanced Chart */}
        <div className="lg:col-span-12 flex flex-col gap-3">
          {/* Ticker tape */}
          <div
            className="w-full rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm isolate"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <iframe
              key={`ticker-${tvTheme}`}
              src={
                "https://s.tradingview.com/embed-widget/ticker-tape/?locale=br#" +
                encodeURIComponent(
                  JSON.stringify({
                    symbols: [
                      { proName: "FX:EURUSD", title: "EUR/USD" },
                      { proName: "FX:GBPUSD", title: "GBP/USD" },
                      { proName: "FX:USDJPY", title: "USD/JPY" },
                      { proName: "PEPPERSTONE:NAS100", title: "Nasdaq 100" },
                      { proName: "PEPPERSTONE:US500", title: "S&P 500" },
                      { proName: "PEPPERSTONE:US30", title: "Dow Jones" },
                      { proName: "OANDA:XAUUSD", title: "Ouro" },
                      { proName: "OANDA:WTICOUSD", title: "WTI Oil" },
                      { proName: "OANDA:NATGASUSD", title: "Gás Natural" },
                      { proName: "COINBASE:BTCUSD", title: "Bitcoin" },
                      { proName: "COINBASE:ETHUSD", title: "Ethereum" },
                    ],
                    showSymbolLogo: true,
                    isTransparent: true,
                    displayMode: "adaptive",
                    colorTheme: tvTheme,
                  }),
                )
              }
              style={{ width: "100%", height: "46px", border: "none" }}
              loading="lazy"
            />
          </div>

          {/* Quick asset shortcut buttons */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_ASSETS.map((asset) => {
              const Icon = asset.icon;
              const isActive = chartSymbol === asset.symbol;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => {
                    setChartSymbol(asset.symbol);
                    setChartExpanded(true);
                    setIframeVisible(true);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {asset.label}
                </button>
              );
            })}
          </div>

          {/* Advanced chart with full tools — collapsible */}
          <div
            ref={watchlistRef}
            className="w-full rounded-[22px] border border-border/40 bg-card overflow-hidden shadow-sm isolate"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <button
              type="button"
              onClick={handleChartToggle}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Gráfico Avançado
              </span>
              {chartExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {chartExpanded && (
              iframeVisible ? (
                <iframe
                  key={`chart-${tvTheme}-${chartSymbol}`}
                  src={
                    `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced&symbol=${encodeURIComponent(chartSymbol)}&interval=60` +
                    "&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6" +
                    "&hide_legend=0&hide_volume=0" +
                    "&studies=%5B%22MAExp%4050%22%2C%22MAExp%40200%22%5D" +
                    `&theme=${tvTheme}&style=1&timezone=America%2FSao_Paulo` +
                    "&withdateranges=1&allow_symbol_change=1" +
                    "&watchlist=FX%3AEURUSD%2CFX%3AGBPUSD%2CFX%3AUSDJPY%2CFX%3AUSDCAD%2COANDA%3AXAUUSD%2CCOINBASE%3ABTCUSD%2CPEPPERSTONE%3ANAS100%2CPEPPERSTONE%3AUS500" +
                    "&details=1&calendar=1&hotlist=1" +
                    "&locale=br"
                  }
                  style={{ width: "100%", height: "500px", border: "none" }}
                  loading="lazy"
                  allowFullScreen
                />
              ) : (
                <div
                  className="flex items-center justify-center animate-pulse"
                  style={{ height: "500px", backgroundColor: "hsl(var(--card))" }}
                >
                  <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* ═══════════ Live Alerts (Ultra) ═══════════ */}
        <LiveAlertsBanner />

        {/* ═══════════ Smart Alerts (Ultra) ═══════════ */}
        <SmartAlertsBanner
          trades={realTrades as unknown as TradeInput[]}
          dailyDdLimit={
            activePropAccount?.max_daily_loss_percent && activePropAccount?.starting_balance_usd
              ? (activePropAccount.max_daily_loss_percent / 100) * activePropAccount.starting_balance_usd
              : null
          }
        />

        {/* ═══════════ Dynamic Widget System ═══════════ */}
        <WidgetRenderer
          layout={localLayout}
          onReorder={handleReorder}
          registry={buildWidgetRegistry({
            journalTrades,
            accountsById,
            dayNotes,
            propAccounts,
            propPayoutsTotal,
            formattedNews,
            newsLoading,
            newsError,
            activeAccountId,
            userId: userId ?? null,
            refreshData: onRefreshData,
          })}
        />

        {/* ═══════════ Backtest Accounts Section ═══════════ */}
        <div className="xl:col-span-12">
        <BacktestSection
          accounts={Array.from(accountsById.values())
            .filter((a) => a.kind === "backtest")
            .map((a) => ({ id: a.id, name: a.name, is_active: a.is_active, starting_balance_usd: a.starting_balance_usd != null ? Number(a.starting_balance_usd) : null }))}
          trades={journalTrades
            .filter((t) => {
              const acc = accountsById.get(t.account_id ?? "");
              return acc?.kind === "backtest" && t.opened_at && t.net_pnl_usd !== null;
            })
            .map((t) => ({
              id: t.id,
              account_id: t.account_id!,
              pnl_usd: t.net_pnl_usd ?? 0,
              net_pnl_usd: t.net_pnl_usd ?? 0,
              opened_at: t.opened_at!,
              symbol: t.symbol ?? "",
              direction: t.direction ?? "long",
            }))}
          userId={userId}
          onTradeAdded={onRefreshData}
        />
        </div>
      </div>
    </div>
  );
}

type NewsItemWithLabel = NewsItem & { timeLabel: string };

// ─── Widget Registry Builder ────────────────────────────────────

interface WidgetRegistryInput {
  journalTrades: JournalTradeKpiRow[];
  accountsById: Map<string, Account>;
  dayNotes: Record<string, DayNote>;
  propAccounts: PropAccountRow[];
  propPayoutsTotal: number;
  formattedNews: NewsItemWithLabel[];
  newsLoading: boolean;
  newsError: string | null;
  activeAccountId: string | null;
  userId: string | null;
  refreshData?: () => void;
}

function buildWidgetRegistry(input: WidgetRegistryInput): Record<string, React.ReactNode> {
  const {
    journalTrades,
    accountsById,
    dayNotes,
    propAccounts,
    propPayoutsTotal,
    formattedNews,
    newsLoading,
    newsError,
    activeAccountId,
    userId,
    refreshData,
  } = input;

  const accountsList = Array.from(accountsById.values());
  // Exclude backtest accounts from main dashboard views
  const realAccounts = accountsList.filter((a) => a.kind !== "backtest");
  const accountsSimple = realAccounts.map((a) => ({ id: a.id, name: a.name }));
  const realAccountIds = new Set(realAccounts.map((a) => a.id));
  const realTrades = journalTrades.filter((t) => realAccountIds.has(t.account_id ?? ""));

  // Find starting balance for active account
  const activeAccount = activeAccountId ? accountsById.get(activeAccountId) : null;
  const activeProp = activeAccountId
    ? propAccounts.find((p) => p.account_id === activeAccountId)
    : null;
  const activeStartingBalance: number | null =
    // Prop accounts: use prop_accounts.starting_balance_usd
    activeProp?.starting_balance_usd
    // Other accounts: use accounts.starting_balance_usd
    ?? (activeAccount?.starting_balance_usd != null && Number(activeAccount.starting_balance_usd) > 0
        ? Number(activeAccount.starting_balance_usd)
        : null)
    // Backtest accounts: default to 100k
    ?? (activeAccount?.kind === "backtest" ? 100_000 : null);

  return {
    // ── Performance (Calendar + Monthly Grid) ──
    performance: (
      <PerformanceCard
        trades={realTrades as unknown as TradeRow[]}
        accounts={accountsSimple}
        dayNotes={dayNotes}
        userId={userId}
        propAccounts={propAccounts}
        startingBalance={activeStartingBalance}
        onTradeDeleted={refreshData}
      />
    ),

    // ── KPI / Journal Briefing ──
    kpi: (
      <JournalBriefing
        trades={realTrades as unknown as TradeRow[]}
        accounts={accountsSimple}
      />
    ),

    // ── Accounts Overview ──
    accounts: (
      <AccountsOverview
        accounts={realAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          kind: a.kind,
          is_active: a.is_active,
        }))}
        propAccounts={propAccounts}
        trades={realTrades
          .filter(
            (t) =>
              t.account_id !== null &&
              t.opened_at !== null &&
              t.direction !== null
          )
          .map((t) => ({
            account_id: t.account_id!,
            pnl_usd: t.net_pnl_usd ?? 0,
            net_pnl_usd: t.net_pnl_usd ?? 0,
            direction: t.direction!,
            opened_at: t.opened_at!,
          }))}
        propPayoutsTotal={propPayoutsTotal}
      />
    ),

    // ── Macro Intelligence (replaces News) ──
    news: <MacroWidgetBriefing />,

    // ── Macro Events ──
    "macro-events": <MacroWidgetEvents />,

    // ── Session Heatmap ──
    "session-heatmap": <SessionHeatmap trades={realTrades} />,

    // ── Top Symbols ──
    "top-symbols": <TopSymbolsWidget trades={realTrades} />,

    // ── Streaks ──
    streaks: <StreaksWidget trades={realTrades} />,

    // ── AI Insight ──
    "ai-insight": <AiInsightWidget />,

    // ── Live Monitoring ──
    "live-monitoring": <LiveMonitoringWidget propAccount={activeProp} />,
  };
}

// ─── News Widget (extracted from inline) ────────────────────────

function NewsWidget({
  items,
  loading,
  error,
}: {
  items: NewsItemWithLabel[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">News</CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
          <Link href="/app/news">Ver tudo</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading && (
          <ul className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={`news-skel-${i}`} className="space-y-2">
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              </li>
            ))}
          </ul>
        )}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma notícia disponível no momento.
          </p>
        )}
        {!loading && items.length > 0 && (
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block hover:underline-offset-2 hover:underline"
                >
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {item.title}
                  </p>
                </a>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.source}</span>
                  {item.timeLabel && <span>· {item.timeLabel} BRT</span>}
                  <Badge
                    variant={
                      item.impact === "HIGH"
                        ? "destructive"
                        : item.impact === "MEDIUM"
                          ? "outline"
                          : "secondary"
                    }
                    className={cn(
                      "ml-auto text-[10px] font-semibold",
                      item.impact === "HIGH"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100"
                        : item.impact === "MEDIUM"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.impact}
                  </Badge>
                </div>
                {i < items.length - 1 && <Separator className="mt-3" />}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="mt-3 text-xs text-muted-foreground">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Top Symbols Widget ─────────────────────────────────────────

function TopSymbolsWidget({
  trades,
}: {
  trades: JournalTradeKpiRow[];
}) {
  const { mask } = usePrivacy();

  const topSymbols = useMemo(() => {
    const bySymbol = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      if (!t.symbol) continue;
      const sym = t.symbol;
      const cur = bySymbol.get(sym) ?? { pnl: 0, count: 0 };
      cur.pnl += t.net_pnl_usd ?? 0;
      cur.count += 1;
      bySymbol.set(sym, cur);
    }
    return Array.from(bySymbol.entries())
      .map(([symbol, stats]) => ({ symbol, ...stats }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }, [trades]);

  return (
    <div
      className="rounded-[22px] border overflow-hidden h-full flex flex-col"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Top Ativos
        </h3>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-5 py-3 flex-1">
        {topSymbols.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhum ativo registrado.
          </p>
        ) : (
          <ul className="space-y-2">
            {topSymbols.map((s, idx) => (
              <li key={s.symbol} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-medium text-muted-foreground w-4 text-right">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {s.symbol}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {mask(`${s.count}`)} trades
                  </span>
                </div>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    color:
                      s.pnl > 0
                        ? "hsl(var(--pnl-positive))"
                        : s.pnl < 0
                          ? "hsl(var(--pnl-negative))"
                          : "hsl(var(--muted-foreground))",
                  }}
                >
                  {mask(formatPnl(s.pnl))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Streaks Widget ─────────────────────────────────────────────

function StreaksWidget({
  trades,
}: {
  trades: JournalTradeKpiRow[];
}) {
  const { mask } = usePrivacy();

  const streakData = useMemo(() => {
    // Sort trades by date ascending
    const sorted = [...trades]
      .filter((t) => t.opened_at)
      .sort((a, b) => a.opened_at!.localeCompare(b.opened_at!));

    let currentStreak = 0;
    let currentType: "W" | "L" = "W";
    let maxWin = 0;
    let maxLoss = 0;
    let tempStreak = 0;
    let tempType: "W" | "L" | null = null;

    for (const t of sorted) {
      const net = t.net_pnl_usd ?? 0;
      const type: "W" | "L" = net >= 0 ? "W" : "L";

      if (type === tempType) {
        tempStreak += 1;
      } else {
        tempType = type;
        tempStreak = 1;
      }

      if (type === "W" && tempStreak > maxWin) maxWin = tempStreak;
      if (type === "L" && tempStreak > maxLoss) maxLoss = tempStreak;

      currentStreak = tempStreak;
      currentType = type;
    }

    return { currentStreak, currentType, maxWin, maxLoss };
  }, [trades]);

  const isWin = streakData.currentType === "W";

  return (
    <div
      className="rounded-[22px] border overflow-hidden h-full flex flex-col"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Sequências
        </h3>
        <Flame className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Atual
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{
              color: isWin ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))",
            }}
          >
            {mask(`${streakData.currentStreak}${streakData.currentType}`)}
          </p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Max Win
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{ color: "hsl(var(--pnl-positive))" }}
          >
            {mask(`${streakData.maxWin}W`)}
          </p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Max Loss
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{ color: "hsl(var(--pnl-negative))" }}
          >
            {mask(`${streakData.maxLoss}L`)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── AI Insight Widget ──────────────────────────────────────────

function AiInsightWidget() {
  return (
    <div
      className="rounded-[22px] border overflow-hidden"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          AI Coach
        </h3>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-5 py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Converse com o AI Coach para insights personalizados sobre seus trades.
        </p>
        <Link
          href="/app/ai-coach"
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          Abrir AI Coach
        </Link>
      </div>
    </div>
  );
}
