"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { formatDateTime, formatDuration, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";
import { ListFilter, TrendingUp } from "lucide-react";
import { getEmotionTag, getDisciplineTag, SETUP_TAGS, MISTAKE_TAGS } from "@/lib/psychology-tags";
import { StickyNote } from "lucide-react";

const PAGE_SIZE = 15;

type DirectionFilter = "all" | "buy" | "sell";
type ResultFilter = "all" | "win" | "loss";

interface JournalTradesTableProps {
  trades: JournalTradeRow[];
  onTradeClick: (trade: JournalTradeRow) => void;
}

export function JournalTradesTable({ trades, onTradeClick }: JournalTradesTableProps) {
  const { mask } = usePrivacy();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = [...trades].sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime());
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((t) => new Date(t.closed_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((t) => new Date(t.closed_at) <= to);
    }
    if (direction !== "all") {
      const d = direction === "buy" ? "buy" : "sell";
      list = list.filter((t) => t.direction?.toLowerCase() === d);
    }
    if (result !== "all") {
      list = list.filter((t) => {
        const net = getNetPnl(t);
        if (result === "win") return net > 0;
        return net < 0;
      });
    }
    if (symbolFilter) {
      list = list.filter((t) => t.symbol.toUpperCase().includes(symbolFilter));
    }
    return list;
  }, [trades, dateFrom, dateTo, direction, result, symbolFilter]);

  // Summary stats
  const summary = useMemo(() => {
    const totalPnl = filtered.reduce((sum, t) => sum + getNetPnl(t), 0);
    const wins = filtered.filter((t) => getNetPnl(t) > 0).length;
    const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;
    return { totalPnl, totalTrades: filtered.length, winRate };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTrades = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Trades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListFilter className="h-3.5 w-3.5" />
            Filtros
          </div>

          {/* Direction pills */}
          <div className="flex rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden isolate" style={{ backgroundColor: "hsl(var(--card))" }}>
            {(["all", "buy", "sell"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setDirection(d); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  direction === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {d === "all" ? "Todos" : d === "buy" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>

          {/* Result pills */}
          <div className="flex rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden isolate" style={{ backgroundColor: "hsl(var(--card))" }}>
            {(["all", "win", "loss"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setResult(r); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  result === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {r === "all" ? "Todos" : r === "win" ? "Win" : "Loss"}
              </button>
            ))}
          </div>

          {/* Symbol search */}
          <input
            type="text"
            value={symbolFilter}
            onChange={(e) => { setSymbolFilter(e.target.value.toUpperCase()); setPage(0); }}
            placeholder="Buscar ativo..."
            className="rounded-xl border border-border/60 bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28"
          />

          {/* Date filters */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="w-[130px] h-8 text-xs border-border/40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="w-[130px] h-8 text-xs border-border/40"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-input border border-border/40 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Símbolo</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Direção</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Abertura</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fechamento</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Duração</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden lg:table-cell">PnL bruto</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden lg:table-cell">Fees</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Net PnL</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resultado</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden xl:table-cell">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageTrades.map((t, idx) => {
                const gross = t.pnl_usd ?? 0;
                const fees = t.fees_usd ?? 0;
                const net = getNetPnl(t);
                const isWin = net > 0;
                const dirLower = (t.direction ?? "").toLowerCase();
                const isBuy = dirLower === "buy";
                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      idx % 2 === 1 && "bg-muted/5",
                      !t.emotion && !t.notes && "border-l-2 border-l-amber-400/60"
                    )}
                    onClick={() => onTradeClick(t)}
                  >
                    <TableCell className="font-semibold text-foreground">{t.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={isBuy ? "default" : "warning"} className="capitalize">
                        {t.direction ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(t.opened_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(t.closed_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDuration(t.opened_at, t.closed_at)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell">
                      {mask(`${gross >= 0 ? "+" : ""}${gross.toFixed(2)}`)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground hidden lg:table-cell">
                      {mask((fees ?? 0).toFixed(2))}
                    </TableCell>
                    <TableCell className={cn("text-right text-sm font-medium", net >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
                      {mask(`${net >= 0 ? "+" : ""}${net.toFixed(2)}`)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isWin ? "success" : "destructive"}>
                        {isWin ? "Win" : "Loss"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap items-center gap-1">
                        {t.emotion && (() => {
                          const tag = getEmotionTag(t.emotion);
                          return tag ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-border/40 px-1.5 py-0.5 text-[10px]" title={tag.labelPtBr}>
                              {tag.icon}
                            </span>
                          ) : null;
                        })()}
                        {t.discipline && (() => {
                          const tag = getDisciplineTag(t.discipline);
                          return tag ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-border/40 px-1.5 py-0.5 text-[10px]" title={tag.labelPtBr}>
                              {tag.icon}
                            </span>
                          ) : null;
                        })()}
                        {t.custom_tags && t.custom_tags.length > 0 && (
                          <>
                            {t.custom_tags.slice(0, 2).map((ctag: string) => {
                              const setupInfo = SETUP_TAGS[ctag];
                              const mistakeInfo = MISTAKE_TAGS[ctag];
                              const info = setupInfo || mistakeInfo;
                              return (
                                <span
                                  key={ctag}
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    mistakeInfo
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                      : setupInfo
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "bg-muted"
                                  )}
                                >
                                  {info?.emoji || ""} {info?.label || ctag}
                                </span>
                              );
                            })}
                            {t.custom_tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{t.custom_tags.length - 2}</span>
                            )}
                          </>
                        )}
                        {(t.notes || t.context) && (
                          <span title="Tem notas"><StickyNote className="h-3 w-3 text-muted-foreground/50" /></span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Nenhum trade encontrado
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Ajuste os filtros ou importe um relatório MT5 para começar.
            </p>
          </div>
        )}

        {/* Summary footer + pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Summary */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                {summary.totalTrades} trade{summary.totalTrades !== 1 ? "s" : ""}
              </span>
              <span className={cn(
                "font-semibold",
                summary.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"
              )}>
                {mask(`${summary.totalPnl >= 0 ? "+" : ""}${summary.totalPnl.toFixed(2)} USD`)}
              </span>
              <span className="text-muted-foreground">
                WR: {summary.winRate.toFixed(0)}%
              </span>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentPage + 1}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="h-7 text-xs"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
