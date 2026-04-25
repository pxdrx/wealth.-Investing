"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, FlaskConical, Plus, TrendingUp, TrendingDown, PlusCircle, Trash2 } from "lucide-react";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { supabase } from "@/lib/supabase/client";
import { AddAccountModal } from "@/components/account/AddAccountModal";
import { TradeScreenshotUpload } from "@/components/journal/TradeScreenshotUpload";
import { uploadTradeScreenshot } from "@/lib/supabase/screenshot";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { MonthlyPerformanceGrid } from "@/components/dashboard/MonthlyPerformanceGrid";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import type { JournalTradeRow } from "@/components/journal/types";
import { useAppT } from "@/hooks/useAppLocale";

const CalendarPnl = dynamic(
  () => import("@/components/calendar/CalendarPnl").then((m) => ({ default: m.CalendarPnl })),
  { ssr: false, loading: () => <div className="h-[260px] w-full rounded-xl bg-muted animate-pulse" /> },
);

interface BacktestAccount {
  id: string;
  name: string;
  is_active: boolean;
  starting_balance_usd?: number | null;
}

interface BacktestTrade {
  id?: string;
  account_id: string;
  pnl_usd: number;
  net_pnl_usd: number;
  opened_at: string;
  symbol?: string;
  direction?: string;
  /** Only present when the trade was imported with SL/entry/volume. Manual
   *  backtest entries from the QuickTradeForm never have it. */
  rr_realized?: number | null;
}

interface BacktestSectionProps {
  accounts: BacktestAccount[];
  trades: BacktestTrade[];
  userId?: string | null;
  onTradeAdded?: () => void;
}

const QUICK_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "US30", "BTCUSD", "USOIL"];

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function detectCategory(sym: string): string {
  const COMMODITIES = ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "NATGAS"];
  const INDICES = ["NAS100", "US30", "US500", "SPX500", "DAX", "FTSE", "NIKKEI"];
  const CRYPTO = ["BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT"];
  if (COMMODITIES.some((c) => sym.includes(c))) return "commodities";
  if (INDICES.some((c) => sym.includes(c))) return "indices";
  if (CRYPTO.some((c) => sym.includes(c))) return "crypto";
  return "forex";
}

// ── Inline Trade Form ──
function QuickTradeForm({ accountId, onTradeAdded }: { accountId: string; onTradeAdded?: () => void }) {
  const t = useAppT();
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [pnl, setPnl] = useState("");
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTimeStr);
  const [observation, setObservation] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSymbols, setSavedSymbols] = useState<string[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  // Load saved symbols on mount
  useEffect(() => {
    async function loadSymbols() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from("user_symbols")
        .select("symbol")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (data) setSavedSymbols(data.map((r: { symbol: string }) => r.symbol));
    }
    loadSymbols();
  }, []);

  const saveSymbol = useCallback(async (sym: string) => {
    if (savedSymbols.includes(sym)) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { error: insertErr } = await supabase
      .from("user_symbols")
      .insert({ user_id: session.user.id, symbol: sym })
      .select()
      .maybeSingle();
    if (!insertErr) setSavedSymbols((prev) => [...prev, sym]);
  }, [savedSymbols]);

  const deleteSymbol = useCallback(async (sym: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    await supabase
      .from("user_symbols")
      .delete()
      .eq("user_id", session.user.id)
      .eq("symbol", sym);
    setSavedSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!symbol.trim() || !pnl.trim() || !accountId) {
      setError(t("backtest.fillAssetAndPnl"));
      return;
    }
    const pnlNum = parseFloat(pnl);
    if (isNaN(pnlNum)) {
      setError(t("backtest.pnlMustBeNumber"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setError(t("backtest.invalidSession")); return; }

      const openedAt = `${date}T${time}:00`;
      const sym = symbol.toUpperCase().trim();

      const { data: insertedTrade, error: dbErr } = await supabase.from("journal_trades").insert({
        user_id: session.user.id,
        account_id: accountId,
        symbol: sym,
        category: detectCategory(sym),
        direction,
        pnl_usd: pnlNum,
        fees_usd: 0,
        opened_at: openedAt,
        closed_at: openedAt,
        notes: observation.trim() || null,
        mistakes: [],
      }).select("id").maybeSingle();

      if (dbErr) { setError(dbErr.message); return; }

      // Upload screenshot if attached (non-blocking — trade already saved)
      if (screenshotFile && insertedTrade?.id) {
        try {
          await uploadTradeScreenshot(session.user.id, insertedTrade.id, screenshotFile);
        } catch (err) {
          console.warn("[backtest] Screenshot upload failed:", err);
        }
      }

      // Save symbol for quick access
      saveSymbol(sym);

      // Reset form immediately
      setSymbol("");
      setPnl("");
      setObservation("");
      setShowObs(false);
      setScreenshotFile(null);
      setDate(todayStr());
      setTime(nowTimeStr());
      setSuccess(true);
      setSaving(false);

      // Refresh data immediately so calendar/KPIs update
      onTradeAdded?.();

      // Clear success badge after 1.5s
      setTimeout(() => setSuccess(false), 1500);
      return; // skip finally setSaving since we already did it
    } catch (err) {
      setError(t("backtest.saveError"));
      console.error("[backtest] Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [symbol, direction, pnl, date, time, accountId, observation, onTradeAdded, saveSymbol]);

  return (
    <div className="rounded-[14px] border border-purple-500/20 p-3 space-y-2.5" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="flex items-center gap-2">
        <Plus className="h-3 w-3 text-purple-500" />
        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{t("journal.add-trade")}</span>
      </div>

      {/* Quick symbol buttons */}
      <div className="flex flex-wrap gap-1">
        {QUICK_SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-medium transition-all border",
              symbol === s
                ? "bg-purple-500 text-white border-purple-500"
                : "border-border/60 text-muted-foreground hover:border-purple-500/40"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Saved symbols */}
      {savedSymbols.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <span className="text-[8px] text-muted-foreground shrink-0 uppercase tracking-wider">{t("addTrade.saved")}:</span>
          {savedSymbols.map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-medium transition-all border shrink-0",
                symbol === s
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:border-blue-500/60"
              )}
            >
              <button type="button" onClick={() => setSymbol(s)} className="cursor-pointer">
                {s}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteSymbol(s); }}
                className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Symbol + Direction + PnL */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder={t("addTrade.asset")}
          aria-label={t("addTrade.asset")}
          className="flex-1 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 uppercase"
        />
        <div className="flex rounded-lg border border-border/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setDirection("buy")}
            className={cn("px-2.5 py-1.5 text-[10px] font-medium transition-colors", direction === "buy" ? "bg-green-500 text-white" : "text-muted-foreground")}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setDirection("sell")}
            className={cn("px-2.5 py-1.5 text-[10px] font-medium transition-colors", direction === "sell" ? "bg-red-500 text-white" : "text-muted-foreground")}
          >
            Sell
          </button>
        </div>
        <input
          type="number"
          value={pnl}
          onChange={(e) => setPnl(e.target.value)}
          placeholder="P&L ($)"
          aria-label={t("backtest.pnlUsd")}
          step="0.01"
          className="w-20 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs font-medium tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
        />
      </div>

      {/* Date + Time */}
      <div className="flex gap-1.5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("backtest.tradeDate")} className="flex-1 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("backtest.tradeTime")} className="w-24 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500" />
      </div>

      {/* Observation — collapsible */}
      <button type="button" onClick={() => setShowObs((v) => !v)} className="text-[9px] text-muted-foreground hover:text-foreground transition-colors">
        {showObs ? `▾ ${t("backtest.hideNotes")}` : `▸ ${t("backtest.addNotes")}`}
      </button>
      {showObs && (
        <textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder={t("backtest.notesPlaceholder")} aria-label={t("backtest.notes")} rows={2} className="w-full rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-[10px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 resize-none" />
      )}

      {/* Screenshot */}
      <TradeScreenshotUpload value={screenshotFile} onChange={setScreenshotFile} compact />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className={cn("w-full rounded-lg py-2 text-xs font-semibold transition-all", success ? "bg-green-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50")}
      >
        {saving ? t("addTrade.saving") : success ? t("backtest.tradeAdded") : t("journal.add-trade")}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Main Section ──
export function BacktestSection({ accounts, trades, userId, onTradeAdded }: BacktestSectionProps) {
  const t = useAppT();
  const [expanded, setExpanded] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null); // null = all
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [localBalanceOverride, setLocalBalanceOverride] = useState<Record<string, number | null>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { mask } = usePrivacy();
  const { refreshAccounts } = useActiveAccount();

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);

  const BACKTEST_DEFAULT_BALANCE = 100_000;

  // Get starting balance: local override → account value → default 100k
  const selectedStartingBalance = useMemo(() => {
    if (!selectedAccountId) return BACKTEST_DEFAULT_BALANCE;
    // Check local override first (set immediately on save)
    if (selectedAccountId in localBalanceOverride) {
      return localBalanceOverride[selectedAccountId] ?? BACKTEST_DEFAULT_BALANCE;
    }
    const acc = activeAccounts.find((a) => a.id === selectedAccountId);
    const val = acc?.starting_balance_usd;
    return val != null && Number(val) > 0 ? Number(val) : BACKTEST_DEFAULT_BALANCE;
  }, [selectedAccountId, activeAccounts, localBalanceOverride]);

  // Sync input with selected account's balance
  useEffect(() => {
    setBalanceInput(selectedStartingBalance ? String(selectedStartingBalance) : "");
  }, [selectedStartingBalance]);

  const saveStartingBalance = useCallback(async () => {
    if (!selectedAccountId) return;
    const num = parseFloat(balanceInput);
    const value = isNaN(num) || num <= 0 ? null : num;

    // Optimistic: update local state immediately so grid refreshes
    setLocalBalanceOverride((prev) => ({ ...prev, [selectedAccountId]: value }));

    try {
      const { error } = await supabase
        .from("accounts")
        .update({ starting_balance_usd: value })
        .eq("id", selectedAccountId);
      if (error) {
        console.warn("[backtest] save balance error:", error.message);
      }
      refreshAccounts();
      onTradeAdded?.();
    } catch (err) {
      console.warn("[backtest] save balance exception:", err);
    }
  }, [selectedAccountId, balanceInput, refreshAccounts, onTradeAdded]);

  const handleDeleteAccount = useCallback(async (accountId: string) => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error("[backtest] No session for delete");
        return;
      }
      const uid = session.user.id;

      // Delete all dependent rows before deleting the account
      const dependentTables = [
        { table: "journal_trades", filters: { account_id: accountId, user_id: uid } },
        { table: "prop_alerts", filters: { account_id: accountId, user_id: uid } },
        { table: "prop_payouts", filters: { account_id: accountId } },
        { table: "prop_accounts", filters: { account_id: accountId } },
        { table: "wallet_transactions", filters: { account_id: accountId } },
        { table: "ingestion_logs", filters: { account_id: accountId } },
      ];

      for (const dep of dependentTables) {
        let query = supabase.from(dep.table).delete();
        for (const [col, val] of Object.entries(dep.filters)) {
          query = query.eq(col, val);
        }
        const { error: depErr } = await query;
        if (depErr) {
          // Table may not exist or column missing — that's ok, skip
          console.warn(`[backtest] cleanup ${dep.table}:`, depErr.message);
        }
      }

      // Delete the account itself
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", uid);

      if (error) {
        console.error("[backtest] Delete account error:", error.message);
        return;
      }

      // Reset selection if the deleted account was selected
      if (selectedAccountId === accountId) {
        setSelectedAccountId(null);
      }
      setConfirmDeleteId(null);
      await refreshAccounts();
      onTradeAdded?.();
    } catch (err) {
      console.error("[backtest] Delete account exception:", err);
    } finally {
      setDeleting(false);
    }
  }, [selectedAccountId, refreshAccounts, onTradeAdded]);

  // Filter trades by selected account
  const filteredTrades = useMemo(() => {
    if (!selectedAccountId) return trades.filter((t) => activeAccounts.some((a) => a.id === t.account_id));
    return trades.filter((t) => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId, activeAccounts]);

  // Stats for filtered trades
  const stats = useMemo(() => {
    const totalPnl = filteredTrades.reduce((s, t) => s + t.net_pnl_usd, 0);
    const wins = filteredTrades.filter((t) => t.net_pnl_usd > 0).length;
    const total = filteredTrades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalWinAmount = filteredTrades.filter((t) => t.net_pnl_usd > 0).reduce((s, t) => s + t.net_pnl_usd, 0);
    const totalLossAmount = filteredTrades.filter((t) => t.net_pnl_usd < 0).reduce((s, t) => s + Math.abs(t.net_pnl_usd), 0);
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;

    let peak = 0, maxDD = 0, cumPnl = 0;
    const sorted = [...filteredTrades].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    for (const t of sorted) {
      cumPnl += t.net_pnl_usd;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDD) maxDD = dd;
    }

    // True per-trade RR. Manual backtest entries from the inline form don't
    // carry SL/entry/volume, so `rr_realized` will usually be null and the
    // UI shows the "adicione SL" empty state. Imported backtests that do
    // include RR are honored here.
    const adapted: JournalTradeRow[] = filteredTrades.map((t) => ({
      id: t.id ?? `bt-${t.opened_at}-${t.account_id}`,
      symbol: t.symbol ?? "",
      direction: t.direction ?? "long",
      opened_at: t.opened_at,
      closed_at: t.opened_at,
      pnl_usd: t.pnl_usd,
      fees_usd: 0,
      net_pnl_usd: t.net_pnl_usd,
      category: null,
      rr_realized: t.rr_realized ?? null,
    }));
    const analytics = computeTradeAnalytics(adapted);

    return {
      totalPnl,
      wins,
      losses: total - wins,
      totalTrades: total,
      winRate,
      profitFactor,
      maxDD,
      avgRR: analytics.avgRR,
      tradesWithoutRR: analytics.tradesWithoutRR,
    };
  }, [filteredTrades]);

  const pnlColor = (v: number) =>
    v > 0 ? "hsl(var(--pnl-positive))" : v < 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--muted-foreground))";

  const selectedAccount = selectedAccountId ? activeAccounts.find((a) => a.id === selectedAccountId) : null;
  const currentAccountId = selectedAccountId ?? activeAccounts[0]?.id ?? "";

  return (
    <>
    <div className="bg-card rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm" style={{ backgroundColor: "hsl(var(--card))" }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
          <FlaskConical className="h-3.5 w-3.5 text-purple-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight">Backtest</h3>
          <p className="text-[10px] text-muted-foreground">
            {activeAccounts.length > 0
              ? `${activeAccounts.length} ${activeAccounts.length !== 1 ? t("backtest.accountsPlural") : t("backtest.account")} · ${stats.totalTrades} trades`
              : t("backtest.simulateTagline")}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4">
          {/* Account selector pills + Add account button */}
          <div className="flex items-center gap-2 pt-3 pb-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedAccountId(null)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                !selectedAccountId
                  ? "bg-purple-500 text-white border-purple-500"
                  : "border-border/60 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
              )}
            >
              {t("backtest.all")}
            </button>
            {activeAccounts.map((a) => (
              <div key={a.id} className="flex items-center gap-0.5">
                {confirmDeleteId === a.id ? (
                  <div className="flex items-center gap-1 rounded-full border border-red-500/40 px-2 py-1">
                    <span className="text-[10px] text-red-500 font-medium">{t("backtest.deleteQuestion")}</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => handleDeleteAccount(a.id)}
                      className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting ? "..." : t("backtest.yes")}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      {t("backtest.no")}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedAccountId(a.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                        selectedAccountId === a.id
                          ? "bg-purple-500 text-white border-purple-500"
                          : "border-border/60 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
                      )}
                    >
                      {a.name}
                    </button>
                    {selectedAccountId === a.id && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(a.id)}
                        className="rounded-full p-1 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title={t("backtest.deleteAccountTitle")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-purple-500/30 px-3 py-1.5 text-[10px] font-medium text-purple-500 transition-colors hover:bg-purple-500/5"
            >
              <PlusCircle className="h-3 w-3" />
              {t("backtest.new")}
            </button>
          </div>

          {activeAccounts.length === 0 && (
            <div className="py-6 text-center">
              <FlaskConical className="mx-auto h-7 w-7 text-purple-500/40 mb-2" />
              <p className="text-xs font-medium text-foreground mb-1">{t("backtest.noAccounts")}</p>
              <p className="text-[10px] text-muted-foreground mb-3">
                {t("backtest.noAccountsHint")}
              </p>
            </div>
          )}

          {activeAccounts.length > 0 && (<>
            {/* Capital simulado label */}

            {/* Quick Trade Form — hidden in "Todas" mode */}
            {selectedAccountId && (
              <div className="pb-2">
                <QuickTradeForm accountId={selectedAccountId} onTradeAdded={onTradeAdded} />
              </div>
            )}
            {!selectedAccountId && (
              <p className="text-[10px] text-muted-foreground pt-2 pb-1 italic">
                {t("backtest.selectAccountHint")}
              </p>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 pt-2 pb-3">
              {[
                { label: "P&L", value: mask(`$${Math.abs(stats.totalPnl).toFixed(0)}`), color: pnlColor(stats.totalPnl), prefix: stats.totalPnl >= 0 ? "+" : "-" },
                { label: t("backtest.kpiWinRate"), value: stats.totalTrades > 0 ? formatPercent(stats.winRate) : "—", color: stats.winRate >= 50 ? "hsl(var(--pnl-positive))" : stats.totalTrades > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--muted-foreground))" },
                { label: "PF", value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : "—", color: stats.profitFactor >= 1 ? "hsl(var(--pnl-positive))" : stats.totalTrades > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--muted-foreground))" },
                { label: "TRADES", value: `${stats.wins}W / ${stats.losses}L`, color: "hsl(var(--foreground))" },
                { label: t("backtest.kpiMaxDd"), value: stats.maxDD > 0 ? mask(`-$${stats.maxDD.toFixed(0)}`) : "—", color: stats.maxDD > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--muted-foreground))" },
                {
                  label: t("backtest.kpiAvgRr"),
                  value:
                    stats.totalTrades > 0 && stats.tradesWithoutRR === stats.totalTrades
                      ? t("backtest.addSlForRr")
                      : stats.avgRR > 0
                        ? stats.avgRR.toFixed(2)
                        : "—",
                  color: "hsl(var(--foreground))",
                },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "hsl(var(--secondary))" }}>
                  <p className="text-[8px] uppercase tracking-wider mb-0.5 text-muted-foreground">{kpi.label}</p>
                  <p className="text-xs font-semibold tabular-nums" style={{ color: kpi.color }}>
                    {"prefix" in kpi && kpi.prefix ? `${kpi.prefix}${kpi.value}` : kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Calendar */}
            <CalendarPnl
              trades={filteredTrades.map((t) => ({
                id: t.id ?? `bt-${t.opened_at}-${t.account_id}`,
                net_pnl_usd: t.net_pnl_usd,
                opened_at: t.opened_at,
                closed_at: t.opened_at,
                account_id: t.account_id,
                symbol: t.symbol ?? "",
                direction: t.direction ?? "long",
                rr_realized: t.rr_realized ?? null,
              }))}
              accounts={selectedAccountId ? undefined : activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
              userId={userId}
              accountId={selectedAccountId ?? null}
              accountIds={activeAccounts.map((a) => a.id)}
              defaultReadOnly
              title={selectedAccount ? selectedAccount.name : t("backtest.calendarTitle")}
              compact
              onTradeDeleted={onTradeAdded}
            />

            {/* Monthly Performance Grid */}
            <div className="pt-3">
              <MonthlyPerformanceGrid
                trades={filteredTrades.map((t) => ({
                  net_pnl_usd: t.net_pnl_usd,
                  opened_at: t.opened_at,
                  account_id: t.account_id,
                }))}
                activeAccountId={selectedAccountId}
                startingBalance={selectedStartingBalance}
              />
            </div>
          </>)}
        </div>
      )}
    </div>

    <AddAccountModal
      open={addModalOpen}
      onOpenChange={setAddModalOpen}
      onAccountCreated={async (id) => {
        setSelectedAccountId(id);
        await refreshAccounts();
        onTradeAdded?.();
      }}
      onRefreshAccounts={refreshAccounts}
      defaultKind="backtest"
    />
    </>
  );
}
