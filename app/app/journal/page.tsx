"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { supabase } from "@/lib/supabase/client";
import { Upload, FileSpreadsheet } from "lucide-react";
import { AccountSelectorInline } from "@/components/account/AccountSelectorInline";
import { JournalKpiCards } from "@/components/journal/JournalKpiCards";
import { JournalEquityChart } from "@/components/journal/JournalEquityChart";
import { JournalTradesTable } from "@/components/journal/JournalTradesTable";
import { TradeDetailModal } from "@/components/journal/TradeDetailModal";
import { PnlCalendar } from "@/components/journal/PnlCalendar";
import type { JournalTradeRow, PeriodFilter } from "@/components/journal/types";

type ImportResult = {
  parser_used?: string;
  trades_found?: number;
  balance_ops_found?: number;
  trades_imported: number;
  trades_duplicates_ignored: number;
  trades_failed?: number;
  imported?: number;
  duplicates?: number;
  failed?: number;
  payouts_detected: number;
  duration_ms: number;
} | null;

export default function JournalPage() {
  const { activeAccountId } = useActiveAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult>(null);
  const [error, setError] = useState<string | null>(null);

  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [startingBalanceUsd, setStartingBalanceUsd] = useState<number | null>(null);

  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [selectedTrade, setSelectedTrade] = useState<JournalTradeRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadTrades = useCallback(async () => {
    if (!activeAccountId) {
      setTrades([]);
      setTradesError(null);
      return;
    }
    setLoadingTrades(true);
    setTradesError(null);
    try {
      const { data, error: err } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, notes, mistakes")
        .eq("account_id", activeAccountId)
        .order("opened_at", { ascending: true });
      if (err) {
        setTradesError(err.message);
        setTrades([]);
      } else {
        setTrades((data ?? []) as JournalTradeRow[]);
      }
    } finally {
      setLoadingTrades(false);
    }
  }, [activeAccountId]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (!activeAccountId) {
      setStartingBalanceUsd(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("prop_accounts")
        .select("starting_balance_usd")
        .eq("account_id", activeAccountId)
        .maybeSingle();
      const v = (data as { starting_balance_usd?: number } | null)?.starting_balance_usd;
      setStartingBalanceUsd(typeof v === "number" && !Number.isNaN(v) ? v : null);
    })();
  }, [activeAccountId]);

  async function handleImport(files: FileList | null) {
    const file = files?.[0];
    if (!file || !activeAccountId) return;
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Sessão inválida. Faça login novamente.");
        return;
      }
      const formData = new FormData();
      formData.set("file", file);
      formData.set("accountId", activeAccountId);
      const res = await fetch("/api/journal/import-mt5", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Erro ${res.status}`);
        return;
      }
      setResult({
        parser_used: data.parser_used ?? undefined,
        trades_found: data.trades_found ?? undefined,
        balance_ops_found: data.balance_ops_found ?? undefined,
        trades_imported: data.trades_imported ?? 0,
        trades_duplicates_ignored: data.trades_duplicates_ignored ?? 0,
        trades_failed: data.trades_failed ?? 0,
        imported: data.imported ?? data.trades_imported ?? 0,
        duplicates: data.duplicates ?? data.trades_duplicates_ignored ?? 0,
        failed: data.failed ?? data.trades_failed ?? 0,
        payouts_detected: data.payouts_detected ?? 0,
        duration_ms: data.duration_ms ?? 0,
      });
      await loadTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleTradeClick = (trade: JournalTradeRow) => {
    setSelectedTrade(trade);
    setModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12" data-account-id={activeAccountId ?? undefined}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
            Journal
          </h1>
        </div>
        <AccountSelectorInline />
      </div>
      <p className="mt-0 text-muted-foreground leading-relaxed-apple">
        Registro de trades e análise de performance.
      </p>

      {/* MT5 Importer — mantido como estava */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Importar MT5</CardTitle>
          <CardDescription>
            Envie o relatório do MetaTrader 5 em .html ou .xlsx (seções Posições e Transações). A conta ativa acima será usada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,text/html,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleImport(e.target.files)}
          />
          <Button
            variant="outline"
            disabled={!activeAccountId || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Importando…
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar MT5 (.html ou .xlsx)
              </>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="rounded-input border border-border/80 bg-muted/20 p-4 text-sm space-y-1">
              <p className="font-medium text-foreground">Resumo da importação</p>
              {result.parser_used != null && (
                <p className="text-muted-foreground">Parser usado: <span className="text-foreground font-medium">{result.parser_used === "html" ? "HTML" : "XLSX"}</span></p>
              )}
              {result.trades_found != null && (
                <p className="text-muted-foreground">Trades encontrados: <span className="text-foreground font-medium">{result.trades_found}</span></p>
              )}
              <p className="text-muted-foreground">Trades importados: <span className="text-foreground font-medium">{result.trades_imported}</span></p>
              <p className="text-muted-foreground">Duplicados ignorados: <span className="text-foreground font-medium">{result.trades_duplicates_ignored}</span></p>
              {(result.trades_failed ?? result.failed ?? 0) > 0 && (
                <p className="text-muted-foreground">Falhas: <span className="text-foreground font-medium text-destructive">{result.trades_failed ?? result.failed ?? 0}</span></p>
              )}
              <p className="text-muted-foreground">Payouts detectados: <span className="text-foreground font-medium">{result.payouts_detected}</span></p>
              <p className="text-muted-foreground text-xs">Tempo: {result.duration_ms} ms</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!activeAccountId && (
        <p className="mt-6 text-sm text-muted-foreground">Selecione uma conta para ver os dados do journal.</p>
      )}

      {activeAccountId && loadingTrades && (
        <p className="mt-6 text-sm text-muted-foreground">Carregando trades…</p>
      )}

      {activeAccountId && tradesError && (
        <p className="mt-6 text-sm text-destructive">{tradesError}</p>
      )}

      {activeAccountId && !loadingTrades && !tradesError && (
        <>
          <section className="mt-8">
            <JournalKpiCards trades={trades} period={period} onPeriodChange={setPeriod} />
          </section>

          <section className="mt-6">
            <JournalEquityChart trades={trades} period={period} startingBalanceUsd={startingBalanceUsd} />
          </section>

          <section className="mt-6">
            <JournalTradesTable trades={trades} onTradeClick={handleTradeClick} />
          </section>

          <section className="mt-6">
            <PnlCalendar accountId={activeAccountId} />
          </section>
        </>
      )}

      <TradeDetailModal
        trade={selectedTrade}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={loadTrades}
      />
    </div>
  );
}
