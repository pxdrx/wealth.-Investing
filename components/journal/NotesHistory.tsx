"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, NotebookPen, FileText, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const easeApple = [0.16, 1, 0.3, 1] as const;

interface NotesHistoryProps {
  userId: string | null;
  accountId: string | null;
  onOpenTrade: (tradeId: string) => void;
  onChanged?: () => void;
}

interface UnifiedNote {
  id: string;
  date: string; // ISO
  text: string;
  tags: string[];
  symbol: string;
  direction: string;
  netPnl: number | null;
  openedAt: string;
  closedAt: string | null;
}

interface TradeNoteRow {
  id: string;
  symbol: string;
  direction: string;
  opened_at: string;
  closed_at: string | null;
  context: string | null;
  custom_tags: string[] | null;
  pnl_usd: number | null;
  fees_usd: number | null;
  net_pnl_usd: number | null;
}

function computeNetPnl(t: TradeNoteRow): number | null {
  if (typeof t.net_pnl_usd === "number") return t.net_pnl_usd;
  if (typeof t.pnl_usd === "number") return t.pnl_usd + (t.fees_usd ?? 0);
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function NotesHistory({
  userId,
  accountId,
  onOpenTrade,
  onChanged,
}: NotesHistoryProps) {
  const [tradeNotes, setTradeNotes] = useState<TradeNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !accountId) {
      setTradeNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Only real trades from the selected account that have annotations
    const { data, error } = await supabase
      .from("journal_trades")
      .select(
        "id, symbol, direction, opened_at, closed_at, context, custom_tags, pnl_usd, fees_usd, net_pnl_usd"
      )
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .order("closed_at", { ascending: false });

    if (!error) {
      const clean = (data ?? []).filter((t) => {
        const ctx = (t.context ?? "").trim();
        const tags = Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [];
        return ctx.length > 0 || tags.length > 0;
      });
      setTradeNotes(clean as TradeNoteRow[]);
    } else {
      setTradeNotes([]);
    }

    setLoading(false);
  }, [userId, accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo<UnifiedNote[]>(() => {
    return tradeNotes.map((t) => ({
      id: t.id,
      date: t.closed_at || t.opened_at,
      text: (t.context ?? "").trim(),
      tags: Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [],
      symbol: t.symbol,
      direction: t.direction,
      netPnl: computeNetPnl(t),
      openedAt: t.opened_at,
      closedAt: t.closed_at,
    }));
  }, [tradeNotes]);

  async function handleDelete(item: UnifiedNote) {
    if (!userId) return;
    if (!confirm("Limpar contexto e tags deste trade? O trade em si não será excluído.")) return;

    setDeletingId(item.id);
    setToast(null);
    try {
      const { error } = await supabase
        .from("journal_trades")
        .update({ context: null, custom_tags: null })
        .eq("id", item.id)
        .eq("user_id", userId);
      if (error) throw error;
      setTradeNotes((prev) => prev.filter((t) => t.id !== item.id));
      onChanged?.();
      setToast("Anotação removida.");
      setTimeout(() => setToast(null), 1800);
    } catch {
      setToast("Erro ao excluir.");
      setTimeout(() => setToast(null), 2400);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeApple }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {items.length} {items.length === 1 ? "anotação" : "anotações"}
        </p>
        {toast && <span>{toast}</span>}
      </div>

      {items.length === 0 ? (
        <Card
          className="rounded-[22px] p-10 text-center"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <NotebookPen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma anotação encontrada.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione contexto ou tags em um trade para vê-lo aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const pnl = item.netPnl ?? 0;
            const isBuy = item.direction.toLowerCase() === "buy";
            return (
              <div
                key={item.id}
                className="group flex items-start gap-3 rounded-[18px] border border-border/50 p-4 transition-colors hover:bg-muted/30"
                style={{ backgroundColor: "hsl(var(--card))" }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <FileText className="h-4 w-4" />
                </div>

                <button
                  type="button"
                  onClick={() => onOpenTrade(item.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
                    <span className="text-sm font-semibold">
                      {item.symbol}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-px text-[10px] font-medium capitalize",
                        isBuy
                          ? "border-emerald-300/60 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                          : "border-amber-300/60 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                      )}
                    >
                      {item.direction}
                    </span>
                    {item.netPnl != null && (
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          pnl >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {pnl.toFixed(2)} USD
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {item.closedAt
                        ? formatDateTime(item.closedAt)
                        : item.openedAt
                        ? formatDateTime(item.openedAt)
                        : formatDate(item.date)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3 whitespace-pre-wrap">
                    {item.text || (
                      <span className="text-muted-foreground italic">
                        Sem texto (apenas tags)
                      </span>
                    )}
                  </p>
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 8).map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  className="flex shrink-0 items-center gap-1.5 self-start rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                  aria-label="Excluir anotação"
                  title="Excluir anotação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
