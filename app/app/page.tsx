"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
import { PaywallGate } from "@/components/billing/PaywallGate";
import {
  DEFAULT_LAYOUT,
  mergeLayout,
  type DashboardLayout,
} from "@/components/dashboard/WidgetRenderer";
import { computeTiltmeter, type TiltmeterResult } from "@/lib/psychology-tags";
import { formatPnl } from "@/components/calendar/utils";
import type { TradeRow, DayNote } from "@/components/calendar/types";
import type { JournalTradeRow } from "@/components/journal/types";
import { supabase } from "@/lib/supabase/client";
import type { Account } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

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
const EquityCurveMini = dynamic(
  () => import("@/components/dashboard/EquityCurveMini").then((m) => ({ default: m.EquityCurveMini })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const SessionHeatmap = dynamic(
  () => import("@/components/dashboard/SessionHeatmap").then((m) => ({ default: m.SessionHeatmap })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
const TiltmeterGauge = dynamic(
  () => import("@/components/dashboard/TiltmeterGauge").then((m) => ({ default: m.TiltmeterGauge })),
  { ssr: false, loading: () => <div className="h-[120px] w-full rounded-xl bg-muted animate-pulse" /> },
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

type JournalTradeKpiRow = {
  id: string;
  net_pnl_usd: number | null;
  opened_at: string | null;
  account_id: string | null;
  symbol: string | null;
  direction: string | null;
};

type NewsItem = {
  title: string;
  source: string;
  publishedAt: string | null;
  url: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
};

type PropAccountRow = {
  account_id: string;
  firm_name: string;
  phase: string;
  starting_balance_usd: number;
  max_daily_loss_percent?: number;
  max_overall_loss_percent?: number;
};

const QUICK_ASSETS = [
  { label: "EUR/USD", symbol: "FX:EURUSD", icon: CircleDollarSign },
  { label: "Ouro", symbol: "TVC:GOLD", icon: Gem },
  { label: "BTC", symbol: "BITSTAMP:BTCUSD", icon: Bitcoin },
  { label: "Petróleo", symbol: "TVC:USOIL", icon: Flame },
  { label: "Brent", symbol: "TVC:UKOIL", icon: Flame },
  { label: "Nasdaq", symbol: "PEPPERSTONE:NAS100", icon: BarChart3 },
  { label: "DXY", symbol: "TVC:DXY", icon: CircleDollarSign },
] as const;

export default function DashboardPage() {
  const { activeAccountId, accounts: ctxAccounts } = useActiveAccount();

  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [journalTrades, setJournalTrades] = useState<JournalTradeKpiRow[]>([]);
  const [journalLoading, setJournalLoading] = useState(true);

  const [accountsById, setAccountsById] = useState<Map<string, Account>>(new Map());
  const [dayNotes, setDayNotes] = useState<Record<string, DayNote>>({});

  const [propAccounts, setPropAccounts] = useState<PropAccountRow[]>([]);
  const [propPayoutsTotal, setPropPayoutsTotal] = useState<number>(0);

  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);

  // Re-fetch trigger: increments when the page regains visibility (e.g. SPA nav back)
  const [refreshKey, setRefreshKey] = useState(0);
  const initialLoadDone = useRef(false);
  const prevCtxAccountLen = useRef(ctxAccounts.length);

  // Sync dashboard data when accounts change in context (e.g., deletion)
  useEffect(() => {
    if (prevCtxAccountLen.current !== ctxAccounts.length && ctxAccounts.length > 0) {
      prevCtxAccountLen.current = ctxAccounts.length;
      setRefreshKey((k) => k + 1);
    }
  }, [ctxAccounts]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && initialLoadDone.current) {
        setRefreshKey((k) => k + 1);
      }
    }
    // Also listen for focus, which fires on SPA navigation back
    function handleFocus() {
      if (initialLoadDone.current) {
        setRefreshKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        console.warn("[dashboard] getSession error", error.message);
        setUserId(null);
        return;
      }
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setSessionChecked(true);
      initialLoadDone.current = true;

      // Load dashboard layout from profile (DB first, localStorage fallback)
      if (uid) {
        let loaded = false;
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("dashboard_layout")
            .eq("id", uid)
            .maybeSingle();
          if (!cancelled && profile?.dashboard_layout) {
            setDashboardLayout(mergeLayout(profile.dashboard_layout as DashboardLayout));
            loaded = true;
          }
        } catch {}
        if (!loaded && !cancelled) {
          try {
            const stored = localStorage.getItem(`wealth-dash-layout-${uid}`);
            if (stored) setDashboardLayout(mergeLayout(JSON.parse(stored)));
          } catch {}
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!userId) {
      setJournalTrades([]);
      setAccountsById(new Map());
      return;
    }
    let cancelled = false;
    setJournalLoading(true);
    (async () => {
      try {
        const [{ data, error }, accountsRes] = await Promise.all([
          supabase
            .from("journal_trades")
            .select("id, net_pnl_usd, opened_at, account_id, symbol, direction")
            .eq("user_id", userId)
            .order("opened_at", { ascending: false }),
          supabase
            .from("accounts")
            .select("id, name, kind, is_active, created_at" as const)
            .eq("user_id", userId),
        ]);
        if (cancelled) return;
        if (error) {
          console.warn("[dashboard] journal kpis error", error.message);
          setJournalTrades([]);
        } else {
          setJournalTrades((data ?? []) as JournalTradeKpiRow[]);
        }
        const accountsMap = new Map<string, Account>();
        for (const row of accountsRes.data ?? []) {
          const acc = row as Account;
          accountsMap.set(acc.id, acc);
        }
        setAccountsById(accountsMap);

        // Fetch prop_accounts and prop_payouts
        const accountIds = (accountsRes.data ?? []).map((a) => a.id);
        if (accountIds.length > 0) {
          const [propAccountsRes, propPayoutsRes] = await Promise.all([
            supabase
              .from("prop_accounts")
              .select("account_id, firm_name, phase, starting_balance_usd, max_daily_loss_percent, max_overall_loss_percent")
              .in("account_id", accountIds),
            supabase
              .from("prop_payouts")
              .select("amount_usd")
              .eq("user_id", userId),
          ]);
          if (!cancelled) {
            setPropAccounts((propAccountsRes.data ?? []) as PropAccountRow[]);
            const total = (propPayoutsRes.data ?? []).reduce(
              (sum, row) => sum + (row.amount_usd ?? 0),
              0
            );
            setPropPayoutsTotal(total);
          }
        }

        // Fetch day notes for calendar
        const { data: notesData } = await supabase
          .from("day_notes")
          .select("date, observation, tags")
          .eq("user_id", userId);
        if (!cancelled && notesData) {
          const notesMap: Record<string, DayNote> = {};
          for (const n of notesData) {
            notesMap[n.date] = { observation: n.observation, tags: n.tags };
          }
          setDayNotes(notesMap);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("[dashboard] journal kpis exception", e);
          setJournalTrades([]);
          setAccountsById(new Map());
        }
      } finally {
        if (!cancelled) {
          setJournalLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      setNewsLoading(true);
      try {
        const res = await fetch("/api/news");
        const json = (await res.json().catch(() => ({}))) as {
          data?: NewsItem[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setNewsError(json.error ?? `Erro ${res.status}`);
          setNews([]);
          return;
        }
        setNews(json.data ?? []);
        setNewsError(null);
      } catch (e) {
        if (!cancelled) {
          console.warn("[dashboard] news fetch error", e);
          setNewsError("Não foi possível carregar as notícias");
          setNews([]);
        }
      } finally {
        if (!cancelled) {
          setNewsLoading(false);
        }
      }
    }

    fetchNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    totalTrades,
    winratePct,
    payoff,
    expectancy,
    perAccountSummaries,
  } = useMemo(() => {
    if (!journalTrades.length) {
      return {
        totalTrades: 0,
        winratePct: 0,
        payoff: null as number | null,
        expectancy: null as number | null,
        perAccountSummaries: [] as { accountId: string; trades: number; wins: number }[],
      };
    }

    let total = 0;
    let wins = 0;
    let winSum = 0;
    let losses = 0;
    let lossSum = 0;
    let totalNet = 0;

    const perAccount = new Map<string, { trades: number; wins: number }>();

    for (const row of journalTrades) {
      const net =
        typeof row.net_pnl_usd === "number" && !Number.isNaN(row.net_pnl_usd)
          ? row.net_pnl_usd
          : 0;
      total += 1;
      totalNet += net;
      if (net > 0) {
        wins += 1;
        winSum += net;
      } else if (net < 0) {
        losses += 1;
        lossSum += net;
      }
      if (row.account_id) {
        const current = perAccount.get(row.account_id) ?? { trades: 0, wins: 0 };
        current.trades += 1;
        if (net > 0) current.wins += 1;
        perAccount.set(row.account_id, current);
      }
    }

    const winrate = total > 0 ? (wins / total) * 100 : 0;
    const avgWin = wins > 0 ? winSum / wins : 0;
    const avgLoss = losses > 0 ? lossSum / losses : 0;
    const payoffVal =
      wins > 0 && losses > 0 && avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : null;
    const expectancyVal = total > 0 ? totalNet / total : null;

    return {
      totalTrades: total,
      winratePct: winrate,
      payoff: payoffVal,
      expectancy: expectancyVal,
      perAccountSummaries: Array.from(perAccount.entries()).map(
        ([accountId, v]) => ({
          accountId,
          trades: v.trades,
          wins: v.wins,
        }),
      ),
    };
  }, [journalTrades]);

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

  const formattedNews = useMemo(() => {
    if (!news) return [];
    return news.slice(0, 6).map((item) => {
      let timeLabel = "";
      if (item.publishedAt) {
        const d = new Date(item.publishedAt);
        if (!Number.isNaN(d.getTime())) {
          timeLabel = d.toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }
      return { ...item, timeLabel };
    });
  }, [news]);

  return (
    <DashboardContent
      activeAccountId={activeAccountId}
      journalTrades={journalTrades}
      journalLoading={journalLoading || !sessionChecked}
      accountsById={accountsById}
      dayNotes={dayNotes}
      propAccounts={propAccounts}
      propPayoutsTotal={propPayoutsTotal}
      watchlistRef={watchlistRef}
      iframeVisible={iframeVisible}
      setIframeVisible={setIframeVisible}
      formattedNews={formattedNews}
      newsLoading={newsLoading}
      newsError={newsError}
      dashboardLayout={dashboardLayout}
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
}) {
  const { hidden, toggle } = usePrivacy();
  const [chartExpanded, setChartExpanded] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("FX:EURUSD");
  const { resolvedTheme } = useTheme();
  const tvTheme = resolvedTheme === "dark" ? "dark" : "light";

  // When chart is expanded, ensure iframe is visible (fixes race with IntersectionObserver)
  const handleChartToggle = () => {
    setChartExpanded((v) => {
      if (!v) setIframeVisible(true);
      return !v;
    });
  };

  if (journalLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8" data-account-id={activeAccountId ?? undefined}>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 auto-rows-min">
        {/* TradingView Advanced Chart */}
        <div className="lg:col-span-12 flex flex-col gap-3">
          {/* Ticker tape */}
          <div
            className="w-full rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm"
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
            className="w-full rounded-[22px] border border-border/40 bg-card overflow-hidden shadow-sm"
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

        {/* ═══════════ Dynamic Widget System ═══════════ */}
        <WidgetRenderer
          layout={dashboardLayout}
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
          })}
        />

        {/* ═══════════ Backtest Accounts Section ═══════════ */}
        <BacktestSection
          accounts={Array.from(accountsById.values())
            .filter((a) => a.kind === "backtest")
            .map((a) => ({ id: a.id, name: a.name, is_active: a.is_active }))}
          trades={journalTrades
            .filter((t) => {
              const acc = accountsById.get(t.account_id ?? "");
              return acc?.kind === "backtest" && t.opened_at && t.net_pnl_usd !== null;
            })
            .map((t) => ({
              account_id: t.account_id!,
              pnl_usd: t.net_pnl_usd ?? 0,
              net_pnl_usd: t.net_pnl_usd ?? 0,
              opened_at: t.opened_at!,
            }))}
        />
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
  } = input;

  const accountsList = Array.from(accountsById.values());
  const accountsSimple = accountsList.map((a) => ({ id: a.id, name: a.name }));

  // Find starting balance for active account (prop accounts only)
  const activeProp = activeAccountId
    ? propAccounts.find((p) => p.account_id === activeAccountId)
    : null;
  const activeStartingBalance = activeProp?.starting_balance_usd ?? null;

  return {
    // ── Calendar ──
    calendar: (
      <CalendarPnl
        trades={journalTrades as unknown as TradeRow[]}
        accounts={accountsSimple}
        dayNotes={dayNotes}
      />
    ),

    // ── KPI / Journal Briefing ──
    kpi: (
      <JournalBriefing
        trades={journalTrades as unknown as TradeRow[]}
        accounts={accountsSimple}
      />
    ),

    // ── Accounts Overview ──
    accounts: (
      <AccountsOverview
        accounts={accountsList.map((a) => ({
          id: a.id,
          name: a.name,
          kind: a.kind,
          is_active: a.is_active,
        }))}
        propAccounts={propAccounts}
        trades={journalTrades
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

    // ── Equity Curve Mini ──
    "equity-mini": <EquityCurveMini trades={journalTrades} startingBalanceUsd={activeStartingBalance} />,

    // ── Session Heatmap ──
    "session-heatmap": <SessionHeatmap trades={journalTrades} />,

    // ── Tiltmeter ──
    tiltmeter: <TiltmeterWidget trades={journalTrades as unknown as JournalTradeRow[]} />,

    // ── Top Symbols ──
    "top-symbols": <TopSymbolsWidget trades={journalTrades} />,

    // ── Streaks ──
    streaks: <StreaksWidget trades={journalTrades} />,

    // ── AI Insight ──
    "ai-insight": <AiInsightWidget />,
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

// ─── Tiltmeter Widget ───────────────────────────────────────────

function TiltmeterWidget({ trades }: { trades: JournalTradeRow[] }) {
  const result = useMemo(() => computeTiltmeter(trades), [trades]);

  const zoneDescription = result.zone === "green"
    ? "Seu estado emocional está positivo com base nos últimos trades."
    : result.zone === "red"
      ? "Sinais de tilt detectados. Considere uma pausa."
      : "Viés emocional neutro nos últimos trades.";

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
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Termômetro Emocional
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Viés emocional baseado nos seus últimos trades
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 px-5 py-4 flex-1">
        <TiltmeterGauge result={result} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Controle: {result.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {zoneDescription}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Escala: -1 (tilt) a +1 (focado)
          </p>
        </div>
      </div>
    </div>
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
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: "hsl(var(--border))" }}>
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
