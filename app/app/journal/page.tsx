"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, Upload, BarChart3, Eye, EyeOff, Plus } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { supabase } from "@/lib/supabase/client";
import { AccountSelectorInline } from "@/components/account/AccountSelectorInline";
import { JournalKpiCards } from "@/components/journal/JournalKpiCards";
import { JournalEquityChart } from "@/components/journal/JournalEquityChart";
import { JournalTradesTable } from "@/components/journal/JournalTradesTable";
import { TradeDetailModal } from "@/components/journal/TradeDetailModal";
import { CalendarPnl } from "@/components/calendar/CalendarPnl";
import { ImportDropZone } from "@/components/journal/ImportDropZone";
import { ImportPreview } from "@/components/journal/ImportPreview";
import { ImportResult } from "@/components/journal/ImportResult";
import type { TradeRow, DayNote } from "@/components/calendar/types";
import type { JournalTradeRow, PeriodFilter } from "@/components/journal/types";
import { computeTiltmeter } from "@/lib/psychology-tags";
import { TiltmeterGauge } from "@/components/dashboard/TiltmeterGauge";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { JournalReports } from "@/components/journal/JournalReports";
import { AddTradeModal } from "@/components/journal/AddTradeModal";

type ImportFlowState = "idle" | "previewing" | "importing" | "done";

interface PreviewTrade {
  symbol: string;
  direction: "buy" | "sell";
  lots: number;
  pnl: number;
  date: string;
}

interface PreviewData {
  fileName: string;
  totalTrades: number;
  payouts: number;
  trades: PreviewTrade[];
  raw: Record<string, unknown>;
}

interface ImportResultData {
  fileName: string;
  imported: number;
  duplicates: number;
  failed: number;
  importedAt: string;
  duration: string;
  duplicateDetails?: Array<{ symbol: string; direction: string; date: string }>;
  skippedDetails?: Array<{ line: number; reason: string; data?: string }>;
}

const tabs = [
  { title: "Visão Geral", icon: LayoutDashboard },
  { title: "Trades", icon: TrendingUp },
  { title: "Relatórios", icon: BarChart3 },
  { type: "separator" as const },
  { title: "Importar MT5", icon: Upload },
];

const SECTION_OVERVIEW = 0;
const SECTION_TRADES = 1;
const SECTION_REPORTS = 2;
const SECTION_IMPORT = 4;

export default function JournalPage() {
  const { activeAccountId, isLoading: accountsLoading } = useActiveAccount();
  const [activeTab, setActiveTab] = useState(0);
  const [importFlowState, setImportFlowState] = useState<ImportFlowState>("idle");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResultData, setImportResultData] = useState<ImportResultData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [startingBalanceUsd, setStartingBalanceUsd] = useState<number | null>(null);
  const [maxOverallLossPercent, setMaxOverallLossPercent] = useState<number | null>(null);
  const [profitTargetPercent, setProfitTargetPercent] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [selectedTrade, setSelectedTrade] = useState<JournalTradeRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dayNotes, setDayNotes] = useState<Record<string, DayNote>>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const pathname = usePathname();

  // Get userId — re-run on navigation (pathname change) so data loads on soft nav
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setUserId(session?.user?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  const loadTrades = useCallback(async () => {
    if (!activeAccountId) { setTrades([]); return; }
    setLoadingTrades(true);
    setTradesError(null);
    try {
      const { data, error: err } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, notes, mistakes, emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating, mfe_usd, mae_usd")
        .eq("account_id", activeAccountId)
        .order("opened_at", { ascending: true });
      if (err) { setTradesError(err.message); setTrades([]); }
      else setTrades((data ?? []) as JournalTradeRow[]);
    } finally {
      setLoadingTrades(false);
    }
  }, [activeAccountId]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  // Fetch day_notes for CalendarPnl
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: notesData } = await supabase
        .from("day_notes")
        .select("date, observation, tags")
        .eq("user_id", userId);
      const notesMap: Record<string, DayNote> = {};
      notesData?.forEach((n: { date: string; observation: string | null; tags: string[] | null }) => {
        notesMap[n.date] = { observation: n.observation ?? "", tags: n.tags };
      });
      setDayNotes(notesMap);
    })();
  }, [userId]);

  useEffect(() => {
    if (!activeAccountId) {
      setStartingBalanceUsd(null);
      setMaxOverallLossPercent(null);
      setProfitTargetPercent(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("prop_accounts")
        .select("starting_balance_usd, max_overall_loss_percent, profit_target_percent")
        .eq("account_id", activeAccountId)
        .maybeSingle();
      const row = data as { starting_balance_usd?: number; max_overall_loss_percent?: number; profit_target_percent?: number } | null;
      setStartingBalanceUsd(typeof row?.starting_balance_usd === "number" ? row.starting_balance_usd : null);
      setMaxOverallLossPercent(typeof row?.max_overall_loss_percent === "number" ? row.max_overall_loss_percent : null);
      setProfitTargetPercent(typeof row?.profit_target_percent === "number" ? row.profit_target_percent : null);
    })();
  }, [activeAccountId]);

  async function handleFileSelected(file: File) {
    if (!activeAccountId) return;
    setImportError(null);
    setPreviewData(null);
    setIsImportLoading(true);
    setImportFlowState("previewing");
    setPendingFile(file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout for preview

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setImportError("Sessão inválida. Faça login novamente.");
        setImportFlowState("idle");
        return;
      }
      const formData = new FormData();
      formData.set("file", file);
      formData.set("accountId", activeAccountId);
      let res: Response;
      try {
        res = await fetch("/api/journal/import-mt5?preview=true", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
          setImportError("Preview excedeu o tempo limite (30s). Tente com um arquivo menor.");
          setImportFlowState("idle");
          return;
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportError(data.error || `Erro ${res.status}`);
        setImportFlowState("idle");
        return;
      }
      // Map API preview response to PreviewData shape
      const rawTrades = (data.preview_trades ?? data.trades ?? []) as Array<Record<string, unknown>>;
      if (rawTrades.length === 0 && !data.trades_found) {
        setImportError("Nenhum trade encontrado no arquivo. Verifique se é um relatório MT5 válido.");
        setImportFlowState("idle");
        return;
      }
      const previewTrades: PreviewTrade[] = rawTrades.map((t) => ({
        symbol: String(t.symbol ?? ""),
        direction: (t.direction === "sell" ? "sell" : "buy") as "buy" | "sell",
        lots: typeof t.lots === "number" ? t.lots : parseFloat(String(t.lots ?? "0")) || 0,
        pnl: typeof t.pnl_usd === "number" ? t.pnl_usd : parseFloat(String(t.pnl_usd ?? t.pnl ?? "0")) || 0,
        date: (() => {
          const raw = t.opened_at ?? t.date;
          if (!raw) return "";
          try { return new Date(String(raw)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return String(raw).slice(0, 10); }
        })(),
      }));
      const preview: PreviewData = {
        fileName: file.name,
        totalTrades: data.trades_found ?? rawTrades.length,
        payouts: data.payouts_detected ?? 0,
        trades: previewTrades,
        raw: data as Record<string, unknown>,
      };
      setPreviewData(preview);
      // Ensure loading is cleared AFTER preview data is set to avoid blank state
      setIsImportLoading(false);
      return; // skip the finally setIsImportLoading since we already set it
    } catch (e) {
      clearTimeout(timeoutId);
      setImportError(e instanceof Error ? e.message : "Falha ao fazer preview");
      setImportFlowState("idle");
    } finally {
      setIsImportLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingFile || !activeAccountId) return;
    setImportError(null);
    setIsImportLoading(true);
    setImportFlowState("importing");
    const startTime = Date.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setImportError("Sessão inválida. Faça login novamente.");
        setImportFlowState("idle");
        return;
      }
      const formData = new FormData();
      formData.set("file", pendingFile);
      formData.set("accountId", activeAccountId);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3 min
      let res: Response;
      try {
        res = await fetch("/api/journal/import-mt5", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
          setImportError("Importação excedeu o tempo limite. Tente com um arquivo menor.");
          setImportFlowState("idle");
          return;
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      const durationMs = Date.now() - startTime;
      if (!res.ok) {
        setImportError(data.error || `Erro ${res.status}`);
        setImportFlowState("idle");
        return;
      }
      const importedAt = new Date().toLocaleString("pt-BR");
      const duration = durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`;
      // Map duplicate_details from API
      const rawDupDetails = (data.duplicate_details ?? []) as Array<Record<string, unknown>>;
      const duplicateDetails = rawDupDetails.map((d) => ({
        symbol: String(d.symbol ?? ""),
        direction: String(d.direction ?? ""),
        date: (() => {
          const raw = d.opened_at ?? d.date;
          if (!raw) return "";
          try { return new Date(String(raw)).toLocaleDateString("pt-BR"); } catch { return String(raw).slice(0, 10); }
        })(),
      }));
      const rawSkipped = (data.skipped_details ?? []) as Array<Record<string, unknown>>;
      const skippedDetails = rawSkipped.map((s) => ({
        line: typeof s.line === "number" ? s.line : parseInt(String(s.line ?? "0"), 10) || 0,
        reason: String(s.reason ?? ""),
        data: s.data != null ? String(s.data) : undefined,
      }));
      setImportResultData({
        fileName: pendingFile.name,
        imported: data.trades_imported ?? 0,
        duplicates: data.trades_duplicates_ignored ?? 0,
        failed: data.trades_failed ?? 0,
        importedAt,
        duration,
        duplicateDetails,
        skippedDetails,
      });
      setImportFlowState("done");
      await loadTrades();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Falha ao importar");
      setImportFlowState("idle");
    } finally {
      setIsImportLoading(false);
    }
  }

  function handleImportReset() {
    setImportFlowState("idle");
    setPreviewData(null);
    setImportResultData(null);
    setPendingFile(null);
    setImportError(null);
  }

  function handleImportCancel() {
    setImportFlowState("idle");
    setPreviewData(null);
    setPendingFile(null);
    setImportError(null);
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
  const { hidden: valuesHidden, toggle: toggleValues } = usePrivacy();

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Registro de operações e análise de performance.</p>
          </div>
          {trades.length > 0 && (
            <TiltmeterGauge result={computeTiltmeter(trades)} size="sm" />
          )}
          <button
            onClick={() => setShowAddTrade(true)}
            className="flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Trade
          </button>
          <button
            onClick={toggleValues}
            className="group relative flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            title={valuesHidden ? "Mostrar valores sensíveis" : "Ocultar valores sensíveis"}
          >
            {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{valuesHidden ? "Mostrar" : "Ocultar"}</span>
          </button>
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
              className="rounded-xl border border-border/60 p-5 space-y-4"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">Importar MT5</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Envie o relatório do MetaTrader 5 (.html ou .xlsx). A conta ativa será usada.
                </p>
              </div>

              {importFlowState === "idle" && (
                <ImportDropZone
                  onFileSelected={handleFileSelected}
                  compact
                  disabled={!activeAccountId}
                />
              )}

              {importFlowState === "previewing" && previewData && (
                <ImportPreview
                  fileName={previewData.fileName}
                  totalTrades={previewData.totalTrades}
                  payouts={previewData.payouts}
                  trades={previewData.trades}
                  compact
                  onConfirm={handleConfirm}
                  onCancel={handleImportCancel}
                  loading={isImportLoading}
                />
              )}

              {importFlowState === "previewing" && !previewData && (
                <div className="space-y-2 py-4">
                  {isImportLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Analisando arquivo...
                    </div>
                  ) : (
                    /* Fallback: stuck in previewing without data — reset to idle */
                    <div className="text-center py-4 space-y-2">
                      <p className="text-sm text-muted-foreground">Não foi possível gerar o preview.</p>
                      <button
                        onClick={handleImportReset}
                        className="text-xs px-4 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {importFlowState === "importing" && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Importando trades...
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: "70%" }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Trades antigos são pulados automaticamente. Apenas novos trades são processados.
                  </p>
                </div>
              )}

              {importFlowState === "done" && importResultData && (
                <ImportResult
                  fileName={importResultData.fileName}
                  imported={importResultData.imported}
                  duplicates={importResultData.duplicates}
                  failed={importResultData.failed}
                  importedAt={importResultData.importedAt}
                  duration={importResultData.duration}
                  duplicateDetails={importResultData.duplicateDetails}
                  skippedDetails={importResultData.skippedDetails}
                  onReset={handleImportReset}
                />
              )}

              {importError && <p className="text-sm text-destructive">{importError}</p>}
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
                <JournalKpiCards trades={trades} period={period} onPeriodChange={setPeriod} startingBalanceUsd={startingBalanceUsd} />
                <JournalEquityChart trades={trades} period={period} startingBalanceUsd={startingBalanceUsd} maxOverallLossPercent={maxOverallLossPercent} profitTargetPercent={profitTargetPercent} />
                <CalendarPnl
                  trades={trades as unknown as TradeRow[]}
                  dayNotes={dayNotes}
                  showConsolidatedToggle={false}
                  userId={userId}
                  onNoteSaved={(date, note) => {
                    setDayNotes((prev) => ({ ...prev, [date]: note }));
                  }}
                />
              </div>
            )}
            {activeTab === SECTION_TRADES && (
              <JournalTradesTable trades={trades} onTradeClick={handleTradeClick} />
            )}
            {activeTab === SECTION_REPORTS && (
              <JournalReports />
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

      {userId && (
        <AddTradeModal
          open={showAddTrade}
          onClose={() => setShowAddTrade(false)}
          onSaved={loadTrades}
          userId={userId}
        />
      )}

    </div>
  );
}
