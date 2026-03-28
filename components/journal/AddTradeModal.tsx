"use client";

import { useState, useEffect } from "react";
import { X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";

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
  const [feesUsd, setFeesUsd] = useState("0");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [symbolSuggestions, setSymbolSuggestions] = useState<string[]>([]);

  // Load user's previously used symbols for autocomplete
  useEffect(() => {
    if (!open || !activeAccountId) return;
    supabase
      .from("journal_trades")
      .select("symbol")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map((d: { symbol: string }) => d.symbol))).sort();
          setSymbolSuggestions(unique);
        }
      });
  }, [open, userId, activeAccountId]);

  async function handleSave() {
    if (!symbol.trim() || !openedAt || !pnlUsd || !activeAccountId) return;

    setSaving(true);
    try {
      const pnl = parseFloat(pnlUsd);
      const fees = parseFloat(feesUsd) || 0;

      const { error } = await supabase.from("journal_trades").insert({
        user_id: userId,
        account_id: activeAccountId,
        symbol: symbol.trim().toUpperCase(),
        direction,
        opened_at: new Date(openedAt).toISOString(),
        closed_at: closedAt ? new Date(closedAt).toISOString() : new Date().toISOString(),
        pnl_usd: pnl,
        fees_usd: fees,
        // FIX TECH-007: Fees are always a cost — subtract absolute value to ensure
        // fees reduce P&L regardless of whether user entered positive or negative.
        net_pnl_usd: pnl - Math.abs(fees),
        context: context.trim() || null,
        notes: notes.trim() || null,
        external_source: "manual",
        external_id: `manual_${Date.now()}`,
      });

      if (error) {
        console.error("[add-trade] DB error:", error.message);
        return;
      }

      // Reset form
      setSymbol("");
      setDirection("buy");
      setOpenedAt("");
      setClosedAt("");
      setPnlUsd("");
      setFeesUsd("0");
      setContext("");
      setNotes("");

      onSaved();
      onClose();
    } catch (err) {
      console.error("[add-trade] Error:", err);
      console.error("[add-trade] Unexpected error:", err);
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
          {/* Symbol */}
          <div>
            <label htmlFor="add-trade-symbol" className="text-sm font-medium text-muted-foreground mb-1.5 block">Ativo</label>
            <input
              id="add-trade-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="ex: EURUSD"
              list="symbol-suggestions"
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <datalist id="symbol-suggestions">
              {symbolSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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

          {/* PnL + Fees */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Taxas (USD)</label>
              <input
                type="number"
                step="0.01"
                value={feesUsd}
                onChange={(e) => setFeesUsd(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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
