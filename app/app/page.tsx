 "use client";

 import { useEffect, useMemo, useState } from "react";
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
 import { useActiveAccount } from "@/components/context/ActiveAccountContext";
 import { PnlCalendar } from "@/components/journal/PnlCalendar";
 import { supabase } from "@/lib/supabase/client";
 import type { Account } from "@/lib/accounts";
import { cn } from "@/lib/utils";

 type JournalTradeKpiRow = {
   net_pnl_usd: number | null;
   opened_at: string | null;
   account_id: string | null;
 };

 type NewsItem = {
   title: string;
   source: string;
   publishedAt: string | null;
   url: string;
   impact: "HIGH" | "MEDIUM" | "LOW";
 };

 export default function DashboardPage() {
   const { activeAccountId } = useActiveAccount();

   const [userId, setUserId] = useState<string | null>(null);

   const [journalTrades, setJournalTrades] = useState<JournalTradeKpiRow[]>([]);
   const [journalLoading, setJournalLoading] = useState(false);

  const [accountsById, setAccountsById] = useState<Map<string, Account>>(new Map());

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
             .select("net_pnl_usd, opened_at, account_id")
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
     <div className="mx-auto max-w-7xl px-6 py-12" data-account-id={activeAccountId ?? undefined}>
       <div className="mb-10">
         <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
           Dashboard
         </h1>
         <p className="mt-1 text-muted-foreground leading-relaxed-apple">
           Visão geral do seu gabinete de negociação.
         </p>
       </div>

       <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
         <Card className="lg:col-span-12 w-full">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
             <CardTitle className="text-base font-medium">
               Watchlist
             </CardTitle>
             <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
               <Link href="/app">Ver tudo</Link>
             </Button>
           </CardHeader>
           <CardContent>
            <div className="w-full rounded-2xl border border-border/70 bg-background overflow-hidden">
              <iframe
                src={
                  "https://s.tradingview.com/embed-widget/market-overview/?locale=br#" +
                  encodeURIComponent(
                    JSON.stringify({
                      colorTheme: "light",
                      isTransparent: true,
                      showSymbolLogo: true,
                      width: "100%",
                      height: 500,
                      tabs: [
                        {
                          title: "Forex",
                          symbols: [
                            { s: "FX:EURUSD" },
                            { s: "FX:GBPUSD" },
                            { s: "FX:USDJPY" },
                            { s: "FX:USDCAD" },
                            { s: "FX:AUDUSD" },
                            { s: "FX:NZDUSD" },
                            { s: "FX:USDCHF" },
                          ],
                        },
                        {
                          title: "Índices",
                          symbols: [
                            { s: "CME_MINI:NQ1!" },
                            { s: "CME_MINI:ES1!" },
                            { s: "CBOT_MINI:YM1!" },
                            { s: "CBOE:VIX" },
                          ],
                        },
                        {
                          title: "Commodities",
                          symbols: [
                            { s: "TVC:GOLD" },
                            { s: "TVC:SILVER" },
                            { s: "TVC:USOIL" },
                            { s: "TVC:UKBRENT" },
                            { s: "OANDA:NATGAS" },
                          ],
                        },
                        {
                          title: "Crypto",
                          symbols: [
                            { s: "BITSTAMP:BTCUSD" },
                            { s: "BITSTAMP:ETHUSD" },
                            { s: "CRYPTOCAP:TOTAL" },
                          ],
                        },
                        {
                          title: "Ações",
                          symbols: [
                            { s: "NASDAQ:AAPL" },
                            { s: "NASDAQ:MSFT" },
                            { s: "NASDAQ:NVDA" },
                            { s: "NASDAQ:AMZN" },
                            { s: "NASDAQ:GOOGL" },
                            { s: "NASDAQ:META" },
                            { s: "NYSE:TSLA" },
                            { s: "NYSE:BRK.B" },
                          ],
                        },
                      ],
                    }),
                  )
                }
                style={{ width: "100%", height: "500px", border: "none" }}
                loading="lazy"
              />
            </div>
           </CardContent>
         </Card>

         <Card className="lg:col-span-6">
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

         <Card className="lg:col-span-6">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
             <CardTitle className="text-base font-medium">
               Resumo do Journal
             </CardTitle>
             <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
               <Link href="/app/journal">Ver tudo</Link>
             </Button>
           </CardHeader>
           <CardContent>
             {journalLoading && (
               <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                 {Array.from({ length: 4 }).map((_, i) => (
                   <div key={`kpi-skel-${i}`} className="space-y-2">
                     <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                     <div className="h-5 w-20 rounded bg-muted animate-pulse" />
                   </div>
                 ))}
               </div>
             )}
             {!journalLoading && (
               <>
                 <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground">
                       Winrate
                     </p>
                     <p className="kpi-value text-xl">
                       {totalTrades > 0 ? `${winratePct.toFixed(0)}%` : "--"}
                     </p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground">
                       Payoff
                     </p>
                     <p className="kpi-value text-xl">
                       {payoff != null ? payoff.toFixed(2) : "--"}
                     </p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground">
                       Expectativa
                     </p>
                     <p className="kpi-value text-xl">
                       {expectancy != null ? expectancy.toFixed(2) : "--"}
                     </p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground">
                       # Trades
                     </p>
                     <p className="kpi-value text-xl">
                       {totalTrades}
                     </p>
                   </div>
                 </div>
                 {perAccountSummaries.length > 0 && (
                   <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                     {perAccountSummaries.map((row) => {
                       const acc = accountsById.get(row.accountId);
                       const name = acc?.name ?? row.accountId;
                       const winrate =
                         row.trades > 0 ? (row.wins / row.trades) * 100 : 0;
                       return (
                         <p key={row.accountId}>
                           {name} — {row.trades} trades | Winrate {winrate.toFixed(0)}%
                         </p>
                       );
                     })}
                   </div>
                 )}
               </>
             )}
           </CardContent>
         </Card>

         <div className="lg:col-span-12">
           <PnlCalendar accountId={activeAccountId} allAccounts userId={userId} />
         </div>
       </div>
     </div>
   );
 }

