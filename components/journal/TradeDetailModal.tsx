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
import { X, Trash2 } from "lucide-react";
import { validateCustomTags } from "@/lib/psychology-tags";

interface TradeDetailModalProps {
  trade: JournalTradeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onDeleted?: (tradeId: string) => void;
}

export function TradeDetailModal({ trade, open, onOpenChange, onSaved, onDeleted }: TradeDetailModalProps) {
  const [context, setContext] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const MAX_TAGS = 4;

  useEffect(() => {
    if (trade) {
      setContext(trade.context ?? "");
      setCustomTags(Array.isArray(trade.custom_tags) ? [...trade.custom_tags] : []);
      setNewTag("");
      setToast(null);
    }
  }, [trade]);

  const handleAddTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (customTags.length >= MAX_TAGS) {
      setToast({ type: "error", message: `Máximo de ${MAX_TAGS} tags por trade.` });
      return;
    }
    if (!customTags.includes(t)) {
      setCustomTags((prev) => [...prev, t]);
      setNewTag("");
      setToast(null);
    }
  };

  const handleRemoveTag = (index: number) => {
    setCustomTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!trade) return;
    setSaving(true);
    setToast(null);
    try {
      const validatedTags = validateCustomTags(customTags);

      const { error } = await supabase
        .from("journal_trades")
        .update({
          context: context || null,
          custom_tags: validatedTags.length ? validatedTags : null,
        })
        .eq("id", trade.id);

      if (error) throw error;
      setToast({ type: "success", message: "Salvo com sucesso." });
      onSaved?.();
      setTimeout(() => {
        onOpenChange(false);
      }, 600);
    } catch (e) {
      setToast({ type: "error", message: "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trade?.id) return;
    if (!confirm("Tem certeza que deseja excluir este trade? Esta acao nao pode ser desfeita.")) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setToast({ type: "error", message: "Sessao expirada. Faca login novamente." });
        return;
      }

      const { error } = await supabase
        .from("journal_trades")
        .delete()
        .eq("id", trade.id)
        .eq("user_id", session.user.id);

      if (error) {
        setToast({ type: "error", message: "Erro ao excluir trade." });
        return;
      }

      onOpenChange(false);
      if (onDeleted) {
        onDeleted(trade.id);
      } else {
        onSaved?.();
      }
    } catch (err) {
      console.error("[trade-detail] Delete error:", err);
      setToast({ type: "error", message: "Erro ao excluir trade." });
    } finally {
      setDeleting(false);
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

          {/* Tags (max 4) */}
          <div className="space-y-2">
            <Label>Tags <span className="text-muted-foreground text-xs">({customTags.length}/{MAX_TAGS})</span></Label>
            <div className="flex flex-wrap gap-2">
              {customTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(i)}
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
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                placeholder={customTags.length >= MAX_TAGS ? "Limite atingido" : "Adicionar tag..."}
                className="flex-1"
                disabled={customTags.length >= MAX_TAGS}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag} disabled={customTags.length >= MAX_TAGS}>
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

        <DialogFooter className="flex !justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Excluindo..." : "Excluir trade"}
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
