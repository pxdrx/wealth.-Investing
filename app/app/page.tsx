"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { PrivacyProvider, usePrivacy } from "@/components/context/PrivacyContext";
import { CalendarPnl } from "@/components/calendar/CalendarPnl";
import { JournalBriefing } from "@/components/dashboard/JournalBriefing";
import { AccountsOverview } from "@/components/dashboard/AccountsOverview";
import { PaywallGate } from "@/components/billing/PaywallGate";
import type { TradeRow, DayNote } from "@/components/calendar/types";
import { supabase } from "@/lib/supabase/client";
import type { Account } from "@/lib/accounts";
import { cn } from "@/lib/utils";

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
  daily_dd_limit?: number;
  max_dd_limit?: number;
};

export default function DashboardPage() {
  const { activeAccountId } = useActiveAccount();

  const [userId, setUserId] = useState<string | null>(null);

  const [journalTrades, setJournalTrades] = useState<JournalTradeKpiRow[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);

  const [accountsById, setAccountsById] = useState<Map<string, Account>>(new Map());
  const [dayNotes, setDayNotes] = useState<Record<string, DayNote>>({});

  const [propAccounts, setPropAccounts] = useState<PropAccountRow[]>([]);
  const [propPayoutsTotal, setPropPayoutsTotal] = useState<number>(0);

  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

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
      setUserId(session?.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
              .select("account_id, firm_name, phase, starting_balance_usd, daily_dd_limit, max_dd_limit")
              .in("account_id", accountIds),
            supabase
              .from("prop_payouts")
              .select("amount_usd")
              .in("account_id", accountIds),
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
    <PrivacyProvider>
    <DashboardContent
      activeAccountId={activeAccountId}
      journalTrades={journalTrades}
      accountsById={accountsById}
      dayNotes={dayNotes}
      propAccounts={propAccounts}
      propPayoutsTotal={propPayoutsTotal}
      watchlistRef={watchlistRef}
      iframeVisible={iframeVisible}
      formattedNews={formattedNews}
      newsLoading={newsLoading}
      newsError={newsError}
    />
    </PrivacyProvider>
  );
}

function DashboardContent({
  activeAccountId,
  journalTrades,
  accountsById,
  dayNotes,
  propAccounts,
  propPayoutsTotal,
  watchlistRef,
  iframeVisible,
  formattedNews,
  newsLoading,
  newsError,
}: {
  activeAccountId: string | null;
  journalTrades: JournalTradeKpiRow[];
  accountsById: Map<string, Account>;
  dayNotes: Record<string, DayNote>;
  propAccounts: PropAccountRow[];
  propPayoutsTotal: number;
  watchlistRef: React.RefObject<HTMLDivElement>;
  iframeVisible: boolean;
  formattedNews: (NewsItem & { timeLabel: string })[];
  newsLoading: boolean;
  newsError: string | null;
}) {
  const { hidden, toggle } = usePrivacy();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12" data-account-id={activeAccountId ?? undefined}>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground leading-relaxed-apple">
            Visão geral do seu gabinete de negociação.
          </p>
        </div>
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          title={hidden ? "Mostrar valores" : "Ocultar valores"}
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{hidden ? "Mostrar" : "Ocultar"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* TradingView Advanced Chart */}
        <div className="lg:col-span-12 flex flex-col gap-3">
          {/* Ticker tape */}
          <div
            className="w-full rounded-xl border overflow-hidden"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
          >
            <iframe
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
                    colorTheme: "light",
                  }),
                )
              }
              style={{ width: "100%", height: "46px", border: "none" }}
              loading="lazy"
            />
          </div>

          {/* Advanced chart with full tools */}
          <div
            ref={watchlistRef}
            className="w-full rounded-xl border overflow-hidden"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
          >
            {iframeVisible ? (
              <iframe
                src={
                  "https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced&symbol=FX%3AEURUSD&interval=60" +
                  "&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6" +
                  "&hide_legend=0&hide_volume=0" +
                  "&studies=%5B%22MAExp%4050%22%2C%22MAExp%40200%22%5D" +
                  "&theme=light&style=1&timezone=America%2FSao_Paulo" +
                  "&withdateranges=1&allow_symbol_change=1" +
                  "&watchlist=FX%3AEURUSD%2CFX%3AGBPUSD%2CFX%3AUSDJPY%2CFX%3AUSDCAD%2COANDA%3AXAUUSD%2CCOINBASE%3ABTCUSD%2CPEPPERSTONE%3ANAS100%2CPEPPERSTONE%3AUS500" +
                  "&details=1&calendar=1&hotlist=1" +
                  "&locale=br"
                }
                style={{ width: "100%", height: "560px", border: "none" }}
                loading="lazy"
                allowFullScreen
              />
            ) : (
              <div
                className="flex items-center justify-center animate-pulse"
                style={{ height: "560px", backgroundColor: "hsl(var(--card))" }}
              >
                <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
              </div>
            )}
          </div>
        </div>

        {/* Calendar — consolidated PnL */}
        <div className="lg:col-span-12">
          <CalendarPnl
            trades={journalTrades as unknown as TradeRow[]}
            accounts={Array.from(accountsById.values()).map(a => ({ id: a.id, name: a.name }))}
            dayNotes={dayNotes}
            showConsolidatedToggle
          />
        </div>

        {/* Journal Briefing — premium KPI card */}
        <div className="lg:col-span-12">
          <JournalBriefing
            trades={journalTrades as unknown as TradeRow[]}
            accounts={Array.from(accountsById.values()).map(a => ({ id: a.id, name: a.name }))}
          />
        </div>

        {/* Accounts Overview — Pro+ */}
        <div className="lg:col-span-12">
          <PaywallGate requiredPlan="pro">
            <AccountsOverview
              accounts={Array.from(accountsById.values()).map((a) => ({
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
          </PaywallGate>
        </div>

        {/* News */}
        <Card className="lg:col-span-12">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium">
              News
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
              <Link href="/app/news">Ver tudo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {newsLoading && (
              <ul className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={`news-skel-${i}`} className="space-y-2">
                    <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  </li>
                ))}
              </ul>
            )}
            {!newsLoading && formattedNews.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma notícia disponível no momento.
              </p>
            )}
            {!newsLoading && formattedNews.length > 0 && (
              <ul className="space-y-4">
                {formattedNews.map((item, i) => (
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
                    {i < formattedNews.length - 1 && <Separator className="mt-3" />}
                  </li>
                ))}
              </ul>
            )}
            {newsError && (
              <p className="mt-3 text-xs text-muted-foreground">
                {newsError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type NewsItemWithLabel = NewsItem & { timeLabel: string };
