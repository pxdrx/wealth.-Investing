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
import { formatDateTime, formatDuration, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";

const PAGE_SIZE = 15;

type DirectionFilter = "all" | "buy" | "sell";
type ResultFilter = "all" | "win" | "loss";

interface JournalTradesTableProps {
  trades: JournalTradeRow[];
  onTradeClick: (trade: JournalTradeRow) => void;
}

export function JournalTradesTable({ trades, onTradeClick }: JournalTradesTableProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");
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
    return list;
  }, [trades, dateFrom, dateTo, direction, result]);

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
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="w-[140px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="w-[140px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Direção</Label>
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as DirectionFilter);
                setPage(0);
              }}
              className="h-10 w-[100px] rounded-input border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Resultado</Label>
            <select
              value={result}
              onChange={(e) => {
                setResult(e.target.value as ResultFilter);
                setPage(0);
              }}
              className="h-10 w-[100px] rounded-input border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
          </div>
        </div>

        <div className="rounded-input border border-border/80 bg-muted/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead>Símbolo</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead className="text-right">PnL bruto</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Net PnL</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageTrades.map((t) => {
                const gross = t.pnl_usd ?? 0;
                const fees = t.fees_usd ?? 0;
                const net = getNetPnl(t);
                const isWin = net > 0;
                const dirLower = (t.direction ?? "").toLowerCase();
                const isBuy = dirLower === "buy";
                return (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => onTradeClick(t)}
                  >
                    <TableCell className="font-medium">{t.symbol}</TableCell>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDuration(t.opened_at, t.closed_at)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {gross >= 0 ? "+" : ""}
                      {gross.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {(fees ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className={cn("text-right text-sm font-medium", net >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
                      {net >= 0 ? "+" : ""}
                      {net.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isWin ? "success" : "destructive"}>
                        {isWin ? "Win" : "Loss"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum trade encontrado com os filtros selecionados.
          </p>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} trade(s) · página {currentPage + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
