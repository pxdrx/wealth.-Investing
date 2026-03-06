"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, Calendar, BarChart2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { supabase } from "@/lib/supabase/client";
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
  trades_imported: number;
  trades_duplicates_ignored: number;
  trades_failed?: number;
  payouts_detected: number;
  duration_ms: number;
} | null;

const tabs = [
  { title: "Visao Geral", icon: LayoutDashboard },
  { title: "Trades", icon: TrendingUp },
  { type: "separator" as const },
  { title: "Calendario", icon: Calendar },
  { title: "Estatisticas", icon: BarChart2 },
  { type: "separator" as const },
  { title: "Importar MT5", icon: Upload },
];

// índices das seções (sem separadores)
const SECTION_OVERVIEW = 0;
const SECTION_TRADES = 1;
const SECTION_CALENDAR = 3;
const SECTION_STATS = 4;
const SECTION_IMPORT = 6;

export default function JournalPage() {
  const { activeAccountId } = useActiveAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(0);
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
  const [showImportPanel, setShowImportPanel] = useState(false);

  const loadTrades = useCallback(async () => {
    if (!activeAccountId) { setTrades([]); return; }
    setLoadingTrades(true);
    setTradesError(null);
    try {
      const { data, error: err } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, notes, mistakes")
        .eq("account_id", activeAccountId)
        .order("opened_at", { ascending: true });
      if (err) { setTradesError(err.message); setTrades([]); }
      else setTrades((data ?? []) as JournalTradeRow[]);
    } finally {
      setLoadingTrades(false);
    }
  }, [activeAccountId]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  useEffect(() => {
    if (!activeAccountId) { setStartingBalanceUsd(null); return; }
    (async () => {
      const { data } = await supabase
        .from("prop_accounts")
        .select("starting_balance_usd")
        .eq("account_id", activeAccountId)
        .maybeSingle();
      const v = (data as { starting_balance_usd?: number } | null)?.starting_balance_usd;
      setStartingBalanceUsd(typeof v === "number" ? v : null);
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
      if (!session?.access_token) { setError("Sessao invalida. Faca login novamente."); return; }
      const formData = new FormData();
      formData.set("file", file);
      formData.set("accountId", activeAccountId);
      const res = await fetch("/api/journal/import-mt5", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Erro ${res.status}`); return; }
      setResult({
        parser_used: data.parser_used,
        trades_found: data.trades_found,
        trades_imported: data.trades_imported ?? 0,
        trades_duplicates_ignored: data.trades_duplicates_ignored ?? 0,
        trades_failed: data.trades_failed ?? 0,
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

  function handleTabChange(index: number | null) {
    if (index === null) return;
    if (index === SECTION_IMPORT) {
      setShowImportPanel((v) => !v);
      return;
    }
    setShowImportPanel(false);
    setActiveTab(index);
  }

  const handleTradeClick = (trade: JournalTradeRow) => {
    setSelectedTrade(trade);
    setModalOpen(true);
  };

  const hasData = activeAccountId && !loadingTrades && !tradesError;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro de trades e analise de performance.</p>
        </div>
        <AccountSelectorInline />
      </div>

      {/* Tab bar */}
      <div className="mb-6">
        <ExpandableTabs
          tabs={tabs}
          activeIndex={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Import panel — aparece quando clica em Importar MT5 */}
      <AnimatePresence>
        {showImportPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Importar MT5</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Envie o relatorio do MetaTrader 5 em .html ou .xlsx. A conta ativa sera usada.
                </p>
              </div>
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
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Importando..." : "Selecionar arquivo (.html ou .xlsx)"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {result && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm space-y-1">
                  <p className="font-medium text-foreground">Resumo da importacao</p>
                  {result.parser_used && <p className="text-muted-foreground">Parser: <span className="text-foreground font-medium">{result.parser_used === "html" ? "HTML" : "XLSX"}</span></p>}
                  {result.trades_found != null && <p className="text-muted-foreground">Encontrados: <span className="text-foreground font-medium">{result.trades_found}</span></p>}
                  <p className="text-muted-foreground">Importados: <span className="text-foreground font-medium">{result.trades_imported}</span></p>
                  <p className="text-muted-foreground">Duplicados ignorados: <span className="text-foreground font-medium">{result.trades_duplicates_ignored}</span></p>
                  {(result.trades_failed ?? 0) > 0 && <p className="text-muted-foreground">Falhas: <span className="text-destructive font-medium">{result.trades_failed}</span></p>}
                  <p className="text-muted-foreground">Payouts: <span className="text-foreground font-medium">{result.payouts_detected}</span></p>
                  <p className="text-xs text-muted-foreground">Tempo: {result.duration_ms}ms</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sem conta selecionada */}
      {!activeAccountId && (
        <p className="text-sm text-muted-foreground">Selecione uma conta para ver os dados do journal.</p>
      )}

      {/* Loading */}
      {activeAccountId && loadingTrades && (
        <p className="text-sm text-muted-foreground">Carregando trades...</p>
      )}

      {/* Erro */}
      {activeAccountId && tradesError && (
        <p className="text-sm text-destructive">{tradesError}</p>
      )}

      {/* Conteúdo das seções */}
      {hasData && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === SECTION_OVERVIEW && (
              <div className="space-y-6">
                <JournalKpiCards trades={trades} period={period} onPeriodChange={setPeriod} />
                <JournalEquityChart trades={trades} period={period} startingBalanceUsd={startingBalanceUsd} />
              </div>
            )}
            {activeTab === SECTION_TRADES && (
              <JournalTradesTable trades={trades} onTradeClick={handleTradeClick} />
            )}
            {activeTab === SECTION_CALENDAR && (
              <PnlCalendar accountId={activeAccountId} />
            )}
            {activeTab === SECTION_STATS && (
              <div className="space-y-6">
                <JournalKpiCards trades={trades} period={period} onPeriodChange={setPeriod} />
                <JournalEquityChart trades={trades} period={period} startingBalanceUsd={startingBalanceUsd} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
