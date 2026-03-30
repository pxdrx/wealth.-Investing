"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { cn } from "@/lib/utils";

const QUICK_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "US30", "BTCUSD", "USOIL"];

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

export function AddTradeModal({ open, onClose, onSaved, userId }: AddTradeModalProps) {
  const { activeAccountId } = useActiveAccount();

  // Form state
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [openedAt, setOpenedAt] = useState("");
  const [closedAt, setClosedAt] = useState("");
  const [pnlUsd, setPnlUsd] = useState("");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSymbols, setSavedSymbols] = useState<string[]>([]);

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
    if (!symbol.trim() || !openedAt || !pnlUsd || !activeAccountId) return;

    setSaving(true);
    try {
      const pnl = parseFloat(pnlUsd);
      const sym = symbol.trim().toUpperCase();

      const { error } = await supabase.from("journal_trades").insert({
        user_id: userId,
        account_id: activeAccountId,
        symbol: sym,
        direction,
        opened_at: new Date(openedAt).toISOString(),
        closed_at: closedAt ? new Date(closedAt).toISOString() : new Date().toISOString(),
        pnl_usd: pnl,
        fees_usd: 0,
        net_pnl_usd: pnl,
        context: context.trim() || null,
        notes: notes.trim() || null,
        external_source: "manual",
        external_id: `manual_${Date.now()}`,
      });

      if (error) {
        console.error("[add-trade] DB error:", error.message);
        return;
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

      onSaved();
      onClose();
    } catch (err) {
      console.error("[add-trade] Error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-[22px] border border-border/40 p-6 shadow-lg isolate mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight">Adicionar Trade</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors" aria-label="Fechar modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Quick symbol buttons */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Ativo</label>
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
                <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wider">Salvos:</span>
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
              placeholder="ex: EURUSD"
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Direcao</label>
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
                <ArrowUp className="h-3.5 w-3.5" /> Compra
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
                <ArrowDown className="h-3.5 w-3.5" /> Venda
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-trade-opened" className="text-sm font-medium text-muted-foreground mb-1.5 block">Abertura</label>
              <input
                id="add-trade-opened"
                type="datetime-local"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="add-trade-closed" className="text-sm font-medium text-muted-foreground mb-1.5 block">Fechamento</label>
              <input
                id="add-trade-closed"
                type="datetime-local"
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* PnL — full width */}
          <div>
            <label htmlFor="add-trade-pnl" className="text-sm font-medium text-muted-foreground mb-1.5 block">P&L (USD)</label>
            <input
              id="add-trade-pnl"
              type="number"
              step="0.01"
              value={pnlUsd}
              onChange={(e) => setPnlUsd(e.target.value)}
              placeholder="ex: 150.00"
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Context */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Contexto (por que entrou?)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Setup, analise, razao da entrada..."
              rows={2}
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Observacoes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que aprendeu, o que faria diferente..."
              rows={2}
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !symbol.trim() || !openedAt || !pnlUsd}
            className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Salvando..." : "Adicionar Trade"}
          </button>
        </div>
      </div>
    </div>
  );
}
