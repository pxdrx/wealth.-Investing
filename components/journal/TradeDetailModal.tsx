"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";
import { supabase } from "@/lib/supabase/client";
import { X } from "lucide-react";

interface TradeDetailModalProps {
  trade: JournalTradeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function TradeDetailModal({ trade, open, onOpenChange, onSaved }: TradeDetailModalProps) {
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [newMistake, setNewMistake] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (trade) {
      setContext(trade.context ?? "");
      setNotes(trade.notes ?? "");
      setMistakes(Array.isArray(trade.mistakes) ? [...trade.mistakes] : []);
      setNewMistake("");
      setToast(null);
    }
  }, [trade]);

  const handleAddMistake = () => {
    const t = newMistake.trim();
    if (t && !mistakes.includes(t)) {
      setMistakes((prev) => [...prev, t]);
      setNewMistake("");
    }
  };

  const handleRemoveMistake = (index: number) => {
    setMistakes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!trade) return;
    setSaving(true);
    setToast(null);
    try {
      const { error } = await supabase
        .from("journal_trades")
        .update({
          context: context || null,
          notes: notes || null,
          mistakes: mistakes.length ? mistakes : null,
        })
        .eq("id", trade.id);

      if (error) throw error;
      setToast({ type: "success", message: "Salvo com sucesso." });
      onSaved?.();
      setTimeout(() => {
        onOpenChange(false);
      }, 600);
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  if (!trade) return null;

  const net = getNetPnl(trade);
  const isWin = net > 0;
  const dirLower = (trade.direction ?? "").toLowerCase();
  const isBuy = dirLower === "buy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" showClose={true}>
        <DialogHeader>
          <DialogTitle>Detalhe do trade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Símbolo</Label>
              <p className="font-medium">{trade.symbol}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direção</Label>
              <p><Badge variant={isBuy ? "default" : "warning"} className="capitalize">{trade.direction ?? "—"}</Badge></p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <p className="text-sm">{trade.category ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Resultado</Label>
              <p><Badge variant={isWin ? "success" : "destructive"}>{isWin ? "Win" : "Loss"}</Badge></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Abertura</Label>
              <p className="text-sm">{formatDateTime(trade.opened_at)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fechamento</Label>
              <p className="text-sm">{formatDateTime(trade.closed_at)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Duração</Label>
              <p className="text-sm">{formatDuration(trade.opened_at, trade.closed_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">PnL bruto</Label>
              <p className="text-sm">{(trade.pnl_usd ?? 0).toFixed(2)} USD</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fees</Label>
              <p className="text-sm">{(trade.fees_usd ?? 0).toFixed(2)} USD</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Net PnL</Label>
              <p className={net >= 0 ? "text-emerald-600 dark:text-emerald-500 font-medium" : "text-red-600 dark:text-red-500 font-medium"}>
                {net >= 0 ? "+" : ""}{net.toFixed(2)} USD
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Contexto</Label>
            <Input
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Contexto do trade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas"
              rows={3}
              className="input-ios w-full resize-y rounded-input border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Erros cometidos</Label>
            <div className="flex flex-wrap gap-2">
              {mistakes.map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => handleRemoveMistake(i)}
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMistake}
                onChange={(e) => setNewMistake(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMistake())}
                placeholder="Adicionar erro..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddMistake}>
                Adicionar
              </Button>
            </div>
          </div>

          {toast && (
            <div
              className={cn(
                "rounded-input border px-3 py-2 text-sm",
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
              )}
            >
              {toast.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
