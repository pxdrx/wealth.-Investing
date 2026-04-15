"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, NotebookPen, Calendar, FileText, Trash2 } from "lucide-react";
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

type NoteKind = "trade" | "day";

interface UnifiedNote {
  kind: NoteKind;
  id: string;
  date: string; // ISO
  text: string;
  tags: string[];
  // trade-only
  symbol?: string;
  direction?: string;
  netPnl?: number | null;
  openedAt?: string;
  closedAt?: string | null;
}

interface DayNoteRow {
  id: string;
  date: string;
  observation: string | null;
  tags: unknown;
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

function coerceTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((t): t is string => typeof t === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
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
  const [dayNotes, setDayNotes] = useState<DayNoteRow[]>([]);
  const [tradeNotes, setTradeNotes] = useState<TradeNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setDayNotes([]);
      setTradeNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Day notes — schema has NO account_id, so we fetch all user's day notes
    const dayPromise = supabase
      .from("day_notes")
      .select("id, date, observation, tags")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    // Trade notes — scoped to active account. Backtest trades are isolated in
    // their own backtest account; never include notes/mistakes columns (those
    // belong to the backtest flow).
    let tradeQuery = supabase
      .from("journal_trades")
      .select(
        "id, symbol, direction, opened_at, closed_at, context, custom_tags, pnl_usd, fees_usd, net_pnl_usd"
      )
      .eq("user_id", userId);
    if (accountId) tradeQuery = tradeQuery.eq("account_id", accountId);
    tradeQuery = tradeQuery.order("closed_at", { ascending: false });

    const [dayRes, tradeRes] = await Promise.all([dayPromise, tradeQuery]);

    setDayNotes(!dayRes.error ? ((dayRes.data ?? []) as DayNoteRow[]) : []);

    if (!tradeRes.error) {
      const clean = (tradeRes.data ?? []).filter((t) => {
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
    const arr: UnifiedNote[] = [];
    for (const d of dayNotes) {
      const tags = coerceTags(d.tags);
      const obs = (d.observation ?? "").trim();
      if (!obs && tags.length === 0) continue;
      arr.push({
        kind: "day",
        id: d.id,
        date: d.date,
        text: obs,
        tags,
      });
    }
    for (const t of tradeNotes) {
      const tags = Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [];
      arr.push({
        kind: "trade",
        id: t.id,
        date: t.closed_at || t.opened_at,
        text: (t.context ?? "").trim(),
        tags,
        symbol: t.symbol,
        direction: t.direction,
        netPnl: computeNetPnl(t),
        openedAt: t.opened_at,
        closedAt: t.closed_at,
      });
    }
    arr.sort((a, b) => {
      const ta = new Date(a.date.length <= 10 ? `${a.date}T12:00:00` : a.date).getTime();
      const tb = new Date(b.date.length <= 10 ? `${b.date}T12:00:00` : b.date).getTime();
      return tb - ta;
    });
    return arr;
  }, [dayNotes, tradeNotes]);

  async function handleDelete(item: UnifiedNote) {
    if (!userId) return;
    const label =
      item.kind === "day"
        ? "Excluir esta anotação diária? Esta ação não pode ser desfeita."
        : "Limpar contexto, tags e notas deste trade? O trade em si não será excluído.";
    if (!confirm(label)) return;

    setDeletingId(item.id);
    setToast(null);
    try {
      if (item.kind === "day") {
        const { error } = await supabase
          .from("day_notes")
          .delete()
          .eq("id", item.id)
          .eq("user_id", userId);
        if (error) throw error;
        setDayNotes((prev) => prev.filter((n) => n.id !== item.id));
      } else {
        const { error } = await supabase
          .from("journal_trades")
          .update({
            context: null,
            custom_tags: null,
          })
          .eq("id", item.id)
          .eq("user_id", userId);
        if (error) throw error;
        setTradeNotes((prev) => prev.filter((t) => t.id !== item.id));
        onChanged?.();
      }
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
          {accountId ? " (trades desta conta + notas diárias)" : ""}
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
            Adicione contexto/tags em um trade ou uma observação no calendário.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isTrade = item.kind === "trade";
            const pnl = item.netPnl ?? 0;
            const isBuy = (item.direction ?? "").toLowerCase() === "buy";
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="group flex items-start gap-3 rounded-[18px] border border-border/50 p-4 transition-colors hover:bg-muted/30"
                style={{ backgroundColor: "hsl(var(--card))" }}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isTrade
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  )}
                >
                  {isTrade ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isTrade) onOpenTrade(item.id);
                  }}
                  disabled={!isTrade}
                  className={cn(
                    "flex-1 min-w-0 text-left",
                    !isTrade && "cursor-default"
                  )}
                >
                  {isTrade ? (
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
                  ) : (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Diária
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  )}
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
