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
import { DayDetailModal } from "@/components/journal/DayDetailModal";
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

const SECTION_OVERVIEW = 0;
const SECTION_TRADES = 1;
const SECTION_CALENDAR = 3;
const SECTION_STATS = 4;
const SECTION_IMPORT = 6;

export default function JournalPage() {
  const { activeAccountId, isLoading: accountsLoading } = useActiveAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [importStage, setImportStage] = useState<"idle" | "uploading" | "processing" | "done">("idle");
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
  const [userId, setUserId] = useState<string | null>(null);
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [noteVersion, setNoteVersion] = useState(0);

  // Get userId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setUserId(session?.user?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

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
    setImportStage("uploading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError("Sessao invalida. Faca login novamente."); setImportStage("idle"); return; }
      const formData = new FormData();
      formData.set("file", file);
      formData.set("accountId", activeAccountId);
      setImportStage("processing");
      const res = await fetch("/api/journal/import-mt5", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Erro ${res.status}`); setImportStage("idle"); return; }
      setResult({
        parser_used: data.parser_used,
        trades_found: data.trades_found,
        trades_imported: data.trades_imported ?? 0,
        trades_duplicates_ignored: data.trades_duplicates_ignored ?? 0,
        trades_failed: data.trades_failed ?? 0,
        payouts_detected: data.payouts_detected ?? 0,
        duration_ms: data.duration_ms ?? 0,
      });
      setImportStage("done");
      await loadTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao importar");
      setImportStage("idle");
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

  const handleDayClick = useCallback((date: string) => {
    setDayModalDate(date);
    setDayModalOpen(true);
  }, []);

  const hasData = activeAccountId && !loadingTrades && !tradesError && !accountsLoading;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro de operações e análise de performance.</p>
        </div>
        <AccountSelectorInline showAddButton />
      </div>

      {/* Tab bar */}
      <div className="mb-6">
        <ExpandableTabs
          tabs={tabs}
          activeIndex={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Import panel */}
      <AnimatePresence>
        {showImportPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div
              className="rounded-xl border border-border/60 p-5 space-y-3"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">Importar MT5</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Envie o relatório do MetaTrader 5 (.html ou .xlsx). A conta ativa será usada.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,text/html,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => handleImport(e.target.files)}
              />
              {importStage === "idle" && (
                <Button
                  variant="outline"
                  disabled={!activeAccountId}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar arquivo
                </Button>
              )}

              {(importStage === "uploading" || importStage === "processing") && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    {importStage === "uploading" ? "Enviando arquivo..." : "Processando trades..."}
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: importStage === "uploading" ? "30%" : "70%", animation: importStage === "processing" ? "pulse 2s ease-in-out infinite" : undefined }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {importStage === "processing" && "Trades antigos são pulados automaticamente. Apenas novos trades são processados."}
                  </p>
                </div>
              )}

              {importStage === "done" && result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Importação concluída!
                  </div>
                  <div className="rounded-lg border border-border/40 p-3 text-sm space-y-1" style={{ backgroundColor: "hsl(var(--muted) / 0.1)" }}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                      {result.trades_found != null && <><span className="text-muted-foreground">Encontrados:</span><span className="font-medium">{result.trades_found}</span></>}
                      <span className="text-muted-foreground">Importados:</span><span className="font-medium text-emerald-600 dark:text-emerald-400">{result.trades_imported}</span>
                      <span className="text-muted-foreground">Duplicados:</span><span className="font-medium">{result.trades_duplicates_ignored}</span>
                      {(result.trades_failed ?? 0) > 0 && <><span className="text-muted-foreground">Falhas:</span><span className="font-medium text-destructive">{result.trades_failed}</span></>}
                      <span className="text-muted-foreground">Payouts:</span><span className="font-medium">{result.payouts_detected}</span>
                      <span className="text-muted-foreground">Tempo:</span><span className="font-medium">{((result.duration_ms) / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setImportStage("idle"); setResult(null); }}>
                    Importar outro arquivo
                  </Button>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context loading */}
      {accountsLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/10 animate-pulse" />
          ))}
        </div>
      )}

      {/* No account selected */}
      {!accountsLoading && !activeAccountId && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Selecione uma conta para ver os dados do journal.</p>
          <p className="text-xs text-muted-foreground mt-1">Use o dropdown acima ou clique em + para adicionar uma nova conta.</p>
        </div>
      )}

      {/* Loading trades */}
      {!accountsLoading && activeAccountId && loadingTrades && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/10 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {activeAccountId && tradesError && (
        <p className="text-sm text-destructive">{tradesError}</p>
      )}

      {/* Tab content */}
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
              <PnlCalendar
                accountId={activeAccountId}
                userId={userId}
                onDayClick={handleDayClick}
                refreshKey={noteVersion}
              />
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

      <DayDetailModal
        date={dayModalDate}
        userId={userId}
        open={dayModalOpen}
        onOpenChange={setDayModalOpen}
        onNoteSaved={() => setNoteVersion((v) => v + 1)}
      />
    </div>
  );
}
