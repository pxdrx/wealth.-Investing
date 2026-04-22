"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { inferCategory } from "@/lib/trading/category";
import { cn } from "@/lib/utils";
import { TradeScreenshotUpload } from "./TradeScreenshotUpload";
import { uploadTradeScreenshot } from "@/lib/supabase/screenshot";
import { TagPicker } from "./TagPicker";
import { validateCustomTags } from "@/lib/psychology-tags";
import { useAppT } from "@/hooks/useAppLocale";

const QUICK_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "US30", "BTCUSD", "USOIL"];

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

export function AddTradeModal({ open, onClose, onSaved, userId }: AddTradeModalProps) {
  const { activeAccountId } = useActiveAccount();
  const t = useAppT();

  // Quick vs Complete mode
  const [mode, setMode] = useState<"quick" | "complete">("quick");

  // Form state
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [openedAt, setOpenedAt] = useState("");
  const [closedAt, setClosedAt] = useState("");
  const [pnlUsd, setPnlUsd] = useState("");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSymbols, setSavedSymbols] = useState<string[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [customTags, setCustomTags] = useState<string[]>([]);

  // Load user's saved symbols from user_symbols table
  useEffect(() => {
    if (!open) return;
    async function loadSymbols() {
      const { data } = await supabase
        .from("user_symbols")
        .select("symbol")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (data) setSavedSymbols(data.map((r: { symbol: string }) => r.symbol));
    }
    loadSymbols();
  }, [open, userId]);

  const saveSymbol = useCallback(async (sym: string) => {
    if (savedSymbols.includes(sym) || QUICK_SYMBOLS.includes(sym)) return;
    const { error: insertErr } = await supabase
      .from("user_symbols")
      .insert({ user_id: userId, symbol: sym })
      .select()
      .maybeSingle();
    if (!insertErr) setSavedSymbols((prev) => [...prev, sym]);
  }, [savedSymbols, userId]);

  const deleteSymbol = useCallback(async (sym: string) => {
    await supabase
      .from("user_symbols")
      .delete()
      .eq("user_id", userId)
      .eq("symbol", sym);
    setSavedSymbols((prev) => prev.filter((s) => s !== sym));
  }, [userId]);

  async function handleSave() {
    const isQuick = mode === "quick";
    if (!symbol.trim() || !pnlUsd || !activeAccountId) return;
    if (!isQuick && !openedAt) return;
    setError(null);

    // Validate closed_at > opened_at (complete mode only)
    if (!isQuick && closedAt) {
      const openDate = new Date(openedAt);
      const closeDate = new Date(closedAt);
      if (closeDate <= openDate) {
        setError(t("addTrade.closeBeforeOpen"));
        return;
      }
    }

    setSaving(true);
    try {
      const pnl = parseFloat(pnlUsd);
      const sym = symbol.trim().toUpperCase();
      const category = inferCategory(sym);

      // Quick mode: auto-fill dates to now
      const now = new Date();
      const effectiveOpenedAt = isQuick ? now.toISOString() : new Date(openedAt).toISOString();
      const effectiveClosedAt = isQuick ? now.toISOString() : (closedAt ? new Date(closedAt).toISOString() : now.toISOString());

      const validatedTags = isQuick ? [] : validateCustomTags(customTags, 10);

      // net_pnl_usd is a GENERATED column (pnl_usd - fees_usd) — do NOT send
      const insertPromise = supabase.from("journal_trades").insert({
        user_id: userId,
        account_id: activeAccountId,
        symbol: sym,
        category,
        direction,
        opened_at: effectiveOpenedAt,
        closed_at: effectiveClosedAt,
        pnl_usd: pnl,
        fees_usd: 0,
        context: isQuick ? null : (context.trim() || null),
        notes: isQuick ? null : (notes.trim() || null),
        custom_tags: validatedTags.length ? validatedTags : null,
        external_source: "manual",
        external_id: `manual_${Date.now()}`,
      }).select("id").maybeSingle();

      // Timeout: abort after 10s to prevent infinite "Salvando..."
      const { data: insertedTrade, error: dbError } = await Promise.race([
        insertPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(t("addTrade.timeout"))), 10_000)
        ),
      ]);

      if (dbError) {
        console.error("[add-trade] DB error:", dbError.code, dbError.message);
        setError(`${t("addTrade.saveError")}: ${dbError.message}`);
        return;
      }

      // Upload screenshot if attached (non-blocking — trade already saved)
      if (screenshotFile && insertedTrade?.id) {
        try {
          await uploadTradeScreenshot(userId, insertedTrade.id, screenshotFile);
        } catch (err) {
          console.warn("[add-trade] Screenshot upload failed:", err);
        }
      }

      // Save symbol for quick access (only custom symbols, not preset ones)
      saveSymbol(sym);

      // Reset form
      setSymbol("");
      setDirection("buy");
      setOpenedAt("");
      setClosedAt("");
      setPnlUsd("");
      setContext("");
      setNotes("");
      setScreenshotFile(null);
      setCustomTags([]);
      setError(null);

      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("addTrade.saveErrorGeneric");
      console.error("[add-trade] Error:", msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm pb-[72px] sm:pb-0">
      <div
        className="relative w-full max-w-lg rounded-t-[22px] sm:rounded-[22px] border border-border/40 shadow-lg isolate mx-0 sm:mx-4 flex flex-col max-h-[75vh] sm:max-h-[90vh]"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Header — fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-0 sm:pb-0 shrink-0">
          <h2 className="text-lg font-semibold tracking-tight">{t("journal.add-trade")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors" aria-label={t("addTrade.closeModal")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mx-4 sm:mx-6 mt-3 p-1 rounded-xl bg-muted/50">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              mode === "quick"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("addTrade.modeQuick")}
          </button>
          <button
            type="button"
            onClick={() => setMode("complete")}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              mode === "complete"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("addTrade.modeComplete")}
          </button>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-4">
          {/* Quick symbol buttons */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.asset")}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_SYMBOLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbol(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                    symbol === s
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/60 text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Saved symbols */}
            {savedSymbols.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none mb-2">
                <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wider">{t("addTrade.saved")}:</span>
                {savedSymbols.map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border shrink-0",
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

            <input
              id="add-trade-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder={t("addTrade.symbolPlaceholder")}
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.direction")}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection("buy")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  direction === "buy"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowUp className="h-3.5 w-3.5" /> {t("addTrade.buy")}
              </button>
              <button
                type="button"
                onClick={() => setDirection("sell")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  direction === "sell"
                    ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                    : "border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowDown className="h-3.5 w-3.5" /> {t("addTrade.sell")}
              </button>
            </div>
          </div>

          {/* Dates — complete mode only */}
          {mode === "complete" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-trade-opened" className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.open")}</label>
                <input
                  id="add-trade-opened"
                  type="datetime-local"
                  value={openedAt}
                  onChange={(e) => setOpenedAt(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-trade-closed" className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.close")}</label>
                <input
                  id="add-trade-closed"
                  type="datetime-local"
                  value={closedAt}
                  onChange={(e) => setClosedAt(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          {/* PnL — full width */}
          <div>
            <label htmlFor="add-trade-pnl" className="text-sm font-medium text-muted-foreground mb-1.5 block">P&L (USD)</label>
            <input
              id="add-trade-pnl"
              type="number"
              step="0.01"
              value={pnlUsd}
              onChange={(e) => setPnlUsd(e.target.value)}
              placeholder={t("addTrade.pnlPlaceholder")}
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Screenshot */}
          <TradeScreenshotUpload value={screenshotFile} onChange={setScreenshotFile} compact />

          {/* Context — complete mode only */}
          {mode === "complete" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.contextLabel")}</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t("addTrade.contextPlaceholder")}
                rows={2}
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          )}

          {/* Notes — complete mode only */}
          {mode === "complete" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.notesLabel")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("addTrade.notesPlaceholder")}
                rows={2}
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          )}

          {/* Tags — complete mode only */}
          {mode === "complete" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("addTrade.tagsLabel")}</label>
              <TagPicker value={customTags} onChange={setCustomTags} allowFreeform maxTags={10} />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Save Button — fixed footer, always visible */}
        <div className="shrink-0 p-4 sm:p-6 pt-3 sm:pt-3 border-t border-border/20">
          <button
            onClick={handleSave}
            disabled={saving || !symbol.trim() || !pnlUsd || (mode === "complete" && !openedAt)}
            className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {saving ? t("addTrade.saving") : t("journal.add-trade")}
          </button>
        </div>
      </div>
    </div>
  );
}
