"use client";

import { useEffect, useState, useCallback } from "react";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, Upload, BarChart3, Eye, EyeOff, Plus, FileSpreadsheet, FileText } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { supabase } from "@/lib/supabase/client";
import { AccountSelectorInline } from "@/components/account/AccountSelectorInline";
import { JournalKpiCards } from "@/components/journal/JournalKpiCards";

const JournalEquityChart = dynamic(() => import("@/components/journal/JournalEquityChart").then(mod => mod.JournalEquityChart), { ssr: false });
import { JournalTradesTable } from "@/components/journal/JournalTradesTable";
import { TradeDetailModal } from "@/components/journal/TradeDetailModal";
import { CalendarPnl } from "@/components/calendar/CalendarPnl";
import { MonthlyPerformanceGrid } from "@/components/dashboard/MonthlyPerformanceGrid";
import { DdBreachModal } from "@/components/account/DdBreachModal";
import { ImportDropZone } from "@/components/journal/ImportDropZone";
import { ImportPreview } from "@/components/journal/ImportPreview";
import { ImportResult } from "@/components/journal/ImportResult";
import type { TradeRow, DayNote } from "@/components/calendar/types";
import type { JournalTradeRow, PeriodFilter } from "@/components/journal/types";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { JournalReports } from "@/components/journal/JournalReports";
import { AddTradeModal } from "@/components/journal/AddTradeModal";
import { PaywallGate } from "@/components/billing/PaywallGate";

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

/** TECH-022: Pagination — load trades in pages instead of all at once */
const PAGE_SIZE = 100;

export default function JournalPage() {
  const { activeAccountId, isLoading: accountsLoading } = useActiveAccount();
  const [activeTab, setActiveTab] = useState(0);
  const [importFlowState, setImportFlowState] = useState<ImportFlowState>("idle");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResultData, setImportResultData] = useState<ImportResultData | null>(null);
  const [ddBreach, setDdBreach] = useState<{ accountName: string; accountId: string; ddPercent: number; ddLimit: number; date: string } | null>(null);
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
  const [tradesPage, setTradesPage] = useState(0);
  const [hasMoreTrades, setHasMoreTrades] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allTradesSummary, setAllTradesSummary] = useState<{ net_pnl_usd: number; opened_at: string; closed_at: string | null; account_id: string }[]>([]);
  // Get userId once on mount — AuthGate already validates the session
  useEffect(() => {
    let cancelled = false;
    // Safety timeout: force userId resolution after 10s
    const safetyTimeout = setTimeout(() => {
      if (!cancelled && userId === null) {
        console.warn("[journal] Safety timeout: getSession did not resolve in 10s");
      }
    }, 10_000);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setUserId(session?.user?.id ?? null);
    })();
    return () => { cancelled = true; clearTimeout(safetyTimeout); };
  // Run once on mount — AuthGate already validates the session, this just
  // extracts the user ID. supabase client is a stable singleton.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** TECH-022: Paginated initial load — fetches first PAGE_SIZE trades */
  const loadTrades = useCallback(async (silent = false) => {
    if (!activeAccountId) { setTrades([]); setHasMoreTrades(true); setTradesPage(0); return; }
    if (!silent) setLoadingTrades(true);
    setTradesError(null);
    setTradesPage(0);
    try {
      const { data, error: err } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, custom_tags, external_source")
        .eq("account_id", activeAccountId)
        .order("opened_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (err) { setTradesError(err.message); setTrades([]); setHasMoreTrades(false); }
      else {
        const rows = (data ?? []) as JournalTradeRow[];
        setHasMoreTrades(rows.length >= PAGE_SIZE);
        // Reverse back to ascending for display (loaded desc for recency)
        setTrades(rows.reverse());
      }
    } finally {
      setLoadingTrades(false);
    }
  }, [activeAccountId]);

  /** TECH-022: Load next page of trades and append */
  const loadMoreTrades = useCallback(async () => {
    if (!activeAccountId || !hasMoreTrades || loadingMore) return;
    setLoadingMore(true);
    const nextPage = tradesPage + 1;
    try {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error: err } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, custom_tags, external_source")
        .eq("account_id", activeAccountId)
        .order("opened_at", { ascending: false })
        .range(from, to);
      if (err) { setTradesError(err.message); }
      else {
        const rows = (data ?? []) as JournalTradeRow[];
        setHasMoreTrades(rows.length >= PAGE_SIZE);
        setTradesPage(nextPage);
        // Prepend older trades (they come desc, reverse to asc, then prepend)
        setTrades((prev) => [...rows.reverse(), ...prev]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeAccountId, hasMoreTrades, loadingMore, tradesPage]);

  // PERF-008: AbortController to cancel stale fetches on re-render
  useEffect(() => {
    const controller = new AbortController();
    loadTrades();
    // Safety timeout: force loadingTrades=false after 10s to prevent infinite spinner
    const safetyTimeout = setTimeout(() => {
      setLoadingTrades((prev) => {
        if (prev) console.warn("[journal] Safety timeout: forcing loadingTrades=false after 10s");
        return false;
      });
    }, 10_000);
    return () => { controller.abort(); clearTimeout(safetyTimeout); };
  }, [loadTrades]);

  // Fetch ALL trades (lightweight — only 3 cols) for MonthlyPerformanceGrid
  useEffect(() => {
    if (!activeAccountId) { setAllTradesSummary([]); return; }
    let aborted = false;
    (async () => {
      const { data } = await supabase
        .from("journal_trades")
        .select("net_pnl_usd, opened_at, closed_at, account_id")
        .eq("account_id", activeAccountId)
        .not("opened_at", "is", null)
        .not("net_pnl_usd", "is", null)
        .order("opened_at", { ascending: true })
        .limit(5000);
      if (aborted) return;
      setAllTradesSummary((data ?? []) as { net_pnl_usd: number; opened_at: string; closed_at: string | null; account_id: string }[]);
    })();
    return () => { aborted = true; };
  }, [activeAccountId]);

  // Fetch day_notes for CalendarPnl (PERF-008: AbortController to prevent stale setState)
  useEffect(() => {
    if (!userId) return;
    let aborted = false;
    (async () => {
      const { data: notesData } = await supabase
        .from("day_notes")
        .select("date, observation, tags")
        .eq("user_id", userId);
      if (aborted) return;
      const notesMap: Record<string, DayNote> = {};
      notesData?.forEach((n: { date: string; observation: string | null; tags: string[] | null }) => {
        notesMap[n.date] = { observation: n.observation ?? "", tags: n.tags };
      });
      setDayNotes(notesMap);
    })();
    return () => { aborted = true; };
  }, [userId]);

  // PERF-008: AbortController to prevent stale setState on account switch
  useEffect(() => {
    if (!activeAccountId) {
      setStartingBalanceUsd(null);
      setMaxOverallLossPercent(null);
      setProfitTargetPercent(null);
      return;
    }
    let aborted = false;
    (async () => {
      // Try prop_accounts first (for prop accounts)
      const { data } = await supabase
        .from("prop_accounts")
        .select("starting_balance_usd, max_overall_loss_percent, profit_target_percent")
        .eq("account_id", activeAccountId)
        .maybeSingle();
      if (aborted) return;
      const row = data as { starting_balance_usd?: number | string; max_overall_loss_percent?: number | string; profit_target_percent?: number | string } | null;

      if (row) {
        setStartingBalanceUsd(row.starting_balance_usd != null ? Number(row.starting_balance_usd) : null);
        setMaxOverallLossPercent(row.max_overall_loss_percent != null ? Number(row.max_overall_loss_percent) : null);
        setProfitTargetPercent(row.profit_target_percent != null ? Number(row.profit_target_percent) : null);
      } else {
        // Fallback: check accounts table (for backtest/personal/crypto)
        const { data: accData } = await supabase
          .from("accounts")
          .select("starting_balance_usd, kind")
          .eq("id", activeAccountId)
          .maybeSingle();
        if (aborted) return;
        const acc = accData as { starting_balance_usd?: number | string; kind?: string } | null;
        const accBalance = acc?.starting_balance_usd != null && Number(acc.starting_balance_usd) > 0
          ? Number(acc.starting_balance_usd)
          : acc?.kind === "backtest" ? 100_000 : null;
        setStartingBalanceUsd(accBalance);
        setMaxOverallLossPercent(null);
        setProfitTargetPercent(null);
      }
    })();
    return () => { aborted = true; };
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
      const rawTrades = (data.sample ?? data.preview_trades ?? data.trades ?? []) as Array<Record<string, unknown>>;
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
      // Check for DD breach
      if (data.dd_breach?.breached && activeAccountId) {
        setDdBreach({
          accountId: activeAccountId,
          accountName: data.dd_breach.accountName,
          ddPercent: data.dd_breach.ddPercent,
          ddLimit: data.dd_breach.ddLimit,
          date: data.dd_breach.date,
        });
      }
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
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro de operações e análise de performance.</p>
        </div>
        <AccountSelectorInline showAddButton />
      </div>

      {/* Tab bar */}
      <div className="mb-4">
        <ExpandableTabs
          tabs={tabs}
          activeIndex={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowAddTrade(true)}
          className="flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Trade
        </button>
        <button
          onClick={toggleValues}
          className="flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          title={valuesHidden ? "Mostrar valores sensíveis" : "Ocultar valores sensíveis"}
        >
          {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{valuesHidden ? "Mostrar" : "Ocultar"}</span>
        </button>
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

      {/* Empty state — no trades yet */}
      {hasData && trades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Nenhum trade encontrado</h3>
          <p className="text-sm text-muted-foreground mb-6">Importe seus trades do MT5 ou adicione manualmente.</p>
          <button
            onClick={() => {
              setShowImportPanel(true);
              setActiveTab(SECTION_OVERVIEW);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Upload className="h-4 w-4" />
            Importar MT5
          </button>
        </div>
      )}

      {/* Tab content */}
      {hasData && trades.length > 0 && (
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
                  userId={userId}
                  accountId={activeAccountId}
                  onNoteSaved={(date, note) => {
                    setDayNotes((prev) => ({ ...prev, [date]: note }));
                  }}
                  onTradeDeleted={() => loadTrades(true)}
                />
                <MonthlyPerformanceGrid
                  trades={allTradesSummary}
                  activeAccountId={activeAccountId}
                  startingBalance={startingBalanceUsd}
                />
              </div>
            )}
            {activeTab === SECTION_TRADES && (
              <div className="space-y-4">
                <JournalTradesTable trades={trades} onTradeClick={handleTradeClick} />
                {hasMoreTrades && (
                  <div className="flex justify-center pt-2 pb-4">
                    <button
                      onClick={loadMoreTrades}
                      disabled={loadingMore}
                      className="flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Carregando...
                        </>
                      ) : (
                        "Carregar mais"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
            {activeTab === SECTION_REPORTS && (
              <PaywallGate requiredPlan="pro" blurContent>
                <JournalReports />
              </PaywallGate>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <TradeDetailModal
        trade={selectedTrade}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={loadTrades}
        onDeleted={(tradeId) => {
          setTrades((prev) => prev.filter((t) => t.id !== tradeId));
          setSelectedTrade(null);
        }}
      />

      {userId && (
        <AddTradeModal
          open={showAddTrade}
          onClose={() => setShowAddTrade(false)}
          onSaved={loadTrades}
          userId={userId}
        />
      )}

      {ddBreach && (
        <DdBreachModal
          open={!!ddBreach}
          onOpenChange={(open) => { if (!open) setDdBreach(null); }}
          accountId={ddBreach.accountId}
          accountName={ddBreach.accountName}
          date={ddBreach.date}
          ddPercent={ddBreach.ddPercent}
          ddLimit={ddBreach.ddLimit}
        />
      )}

    </div>
  );
}
