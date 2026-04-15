"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { NoteRow, type NoteRowItem } from "./NoteRow";

const easeApple = [0.16, 1, 0.3, 1] as const;

interface NotesHistoryProps {
  userId: string | null;
  accountId: string | null;
  onOpenTrade: (tradeId: string) => void;
  onChanged?: () => void;
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

export function NotesHistory({
  userId,
  accountId,
  onOpenTrade,
  onChanged,
}: NotesHistoryProps) {
  const [rows, setRows] = useState<TradeNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !accountId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("journal_trades")
      .select(
        "id, symbol, direction, opened_at, closed_at, context, custom_tags, pnl_usd, fees_usd, net_pnl_usd"
      )
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .or("context.not.is.null,custom_tags.not.is.null")
      .order("closed_at", { ascending: false });

    if (error) {
      setRows([]);
    } else {
      // client-side filter: drop empty-string context + empty-array tags
      const clean = (data ?? []).filter((t) => {
        const ctx = (t.context ?? "").trim();
        const tags = Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [];
        return ctx.length > 0 || tags.length > 0;
      });
      setRows(clean as TradeNoteRow[]);
    }
    setLoading(false);
  }, [userId, accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const items: NoteRowItem[] = rows.map((t) => ({
    id: t.id,
    date: t.closed_at || t.opened_at,
    symbol: t.symbol,
    direction: t.direction,
    preview: (t.context ?? "").trim(),
    tags: Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [],
    netPnl: computeNetPnl(t),
  }));

  async function handleDelete(item: NoteRowItem) {
    if (!userId) return;
    if (
      !confirm(
        "Limpar contexto e tags desta anotação? O trade em si não será excluído."
      )
    )
      return;

    setDeletingId(item.id);
    setToast(null);
    try {
      const { error } = await supabase
        .from("journal_trades")
        .update({ context: null, custom_tags: null })
        .eq("id", item.id)
        .eq("user_id", userId);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== item.id));
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

  if (!accountId) {
    return (
      <Card
        className="rounded-[22px] p-10 text-center"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <p className="text-sm text-muted-foreground">
          Selecione uma conta para ver suas anotações.
        </p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeApple }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "anotação" : "anotações"} nesta conta
        </p>
        {toast && (
          <span className="text-xs text-muted-foreground">{toast}</span>
        )}
      </div>

      {items.length === 0 ? (
        <Card
          className="rounded-[22px] p-10 text-center"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <NotebookPen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Você ainda não anotou nada nesta conta.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Abra um trade na aba Trades ou no calendário e adicione contexto ou tags.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <NoteRow
              key={item.id}
              item={item}
              onOpen={() => onOpenTrade(item.id)}
              onDelete={handleDelete}
              deleting={deletingId === item.id}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
