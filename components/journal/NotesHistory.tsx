"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  FileText,
  ListFilter,
  Loader2,
  NotebookPen,
  Search,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const easeApple = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NotesHistoryProps {
  userId: string | null;
  accountId: string | null;
  onOpenTrade: (tradeId: string) => void;
  onChanged?: () => void;
}

type NoteType = "trade" | "day";
type TypeFilter = "all" | "trades" | "days";

interface UnifiedNote {
  type: NoteType;
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

interface DayNoteRow {
  id: string;
  date: string;
  observation: string | null;
  tags: unknown;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function coerceTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value))
    return value.filter(
      (t): t is string => typeof t === "string" && t.trim().length > 0
    );
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

function toComparable(iso: string): string {
  return iso.length <= 10 ? iso : iso.slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NotesHistory({
  userId,
  accountId,
  onOpenTrade,
  onChanged,
}: NotesHistoryProps) {
  const [tradeNotes, setTradeNotes] = useState<TradeNoteRow[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* ---- data fetching ---- */

  const load = useCallback(async () => {
    if (!userId) {
      setTradeNotes([]);
      setDayNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Day notes — user-level (no account_id in schema)
    const dayPromise = supabase
      .from("day_notes")
      .select("id, date, observation, tags")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(500);

    // Trade notes — scoped to active account
    const tradePromise = accountId
      ? supabase
          .from("journal_trades")
          .select(
            "id, symbol, direction, opened_at, closed_at, context, custom_tags, pnl_usd, fees_usd, net_pnl_usd"
          )
          .eq("user_id", userId)
          .eq("account_id", accountId)
          .order("closed_at", { ascending: false })
      : Promise.resolve({ data: [] as TradeNoteRow[], error: null });

    const [dayRes, tradeRes] = await Promise.all([dayPromise, tradePromise]);

    // Day notes
    if (!dayRes.error) {
      const rows = (dayRes.data ?? []) as DayNoteRow[];
      setDayNotes(
        rows.filter((d) => {
          const obs = (d.observation ?? "").trim();
          const tags = coerceTags(d.tags);
          return obs.length > 0 || tags.length > 0;
        })
      );
    } else {
      setDayNotes([]);
    }

    // Trade notes — filter to those with annotations
    if (!tradeRes.error) {
      const clean = ((tradeRes.data ?? []) as TradeNoteRow[]).filter((t) => {
        const ctx = (t.context ?? "").trim();
        const tags = Array.isArray(t.custom_tags)
          ? t.custom_tags.filter(Boolean)
          : [];
        return ctx.length > 0 || tags.length > 0;
      });
      setTradeNotes(clean);
    } else {
      setTradeNotes([]);
    }

    setLoading(false);
  }, [userId, accountId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- merge + filter ---- */

  const allItems = useMemo<UnifiedNote[]>(() => {
    const arr: UnifiedNote[] = [];

    for (const d of dayNotes) {
      arr.push({
        type: "day",
        id: d.id,
        date: d.date,
        text: (d.observation ?? "").trim(),
        tags: coerceTags(d.tags),
      });
    }

    for (const t of tradeNotes) {
      arr.push({
        type: "trade",
        id: t.id,
        date: t.closed_at || t.opened_at,
        text: (t.context ?? "").trim(),
        tags: Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [],
        symbol: t.symbol,
        direction: t.direction,
        netPnl: computeNetPnl(t),
        openedAt: t.opened_at,
        closedAt: t.closed_at,
      });
    }

    arr.sort((a, b) => {
      const ta = new Date(
        a.date.length <= 10 ? `${a.date}T12:00:00` : a.date
      ).getTime();
      const tb = new Date(
        b.date.length <= 10 ? `${b.date}T12:00:00` : b.date
      ).getTime();
      return tb - ta;
    });

    return arr;
  }, [dayNotes, tradeNotes]);

  const filtered = useMemo(() => {
    let items = allItems;

    // Type filter
    if (typeFilter === "trades") items = items.filter((i) => i.type === "trade");
    if (typeFilter === "days") items = items.filter((i) => i.type === "day");

    // Date range
    if (dateFrom) {
      items = items.filter((i) => toComparable(i.date) >= dateFrom);
    }
    if (dateTo) {
      items = items.filter((i) => toComparable(i.date) <= dateTo);
    }

    // Symbol filter (trade notes only; day notes always pass)
    if (symbolFilter) {
      const upper = symbolFilter.toUpperCase();
      items = items.filter(
        (i) => i.type === "day" || (i.symbol ?? "").toUpperCase().includes(upper)
      );
    }

    // Text search
    if (searchText) {
      const lower = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.text.toLowerCase().includes(lower) ||
          i.tags.some((t) => t.toLowerCase().includes(lower))
      );
    }

    return items;
  }, [allItems, typeFilter, dateFrom, dateTo, symbolFilter, searchText]);

  /* ---- delete ---- */

  async function handleDelete(item: UnifiedNote) {
    if (!userId) return;

    const msg =
      item.type === "day"
        ? "Excluir esta nota do dia? Esta ação não pode ser desfeita."
        : "Limpar contexto e tags deste trade? O trade em si não será excluído.";
    if (!confirm(msg)) return;

    setDeletingId(item.id);
    setToast(null);
    try {
      if (item.type === "day") {
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
          .update({ context: null, custom_tags: null })
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

  /* ---- render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnyFilters =
    typeFilter !== "all" || symbolFilter || searchText || dateFrom || dateTo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeApple }}
      className="space-y-4"
    >
      {/* ---- Filter bar ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          Filtros
        </div>

        {/* Type pills */}
        <div
          className="flex rounded-lg border border-border/40 overflow-hidden isolate shadow-sm"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          {(["all", "trades", "days"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {t === "all" ? "Todos" : t === "trades" ? "Trades" : "Diário"}
            </button>
          ))}
        </div>

        {/* Symbol search */}
        <input
          type="text"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
          placeholder="Buscar ativo..."
          className="rounded-xl border border-border/60 bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28"
        />

        {/* Text search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar no texto..."
            className="rounded-xl border border-border/60 bg-transparent pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-40"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[130px] h-8 text-xs border-border/40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[130px] h-8 text-xs border-border/40"
            />
          </div>
        </div>
      </div>

      {/* ---- Count + toast ---- */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {filtered.length} {filtered.length === 1 ? "anotação" : "anotações"}
          {hasAnyFilters ? " (filtrado)" : ""}
        </p>
        {toast && <span>{toast}</span>}
      </div>

      {/* ---- Cards ---- */}
      {filtered.length === 0 ? (
        <Card
          className="rounded-[22px] p-10 text-center"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <NotebookPen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasAnyFilters
              ? "Nenhuma anotação com esses filtros."
              : "Nenhuma anotação encontrada."}
          </p>
          {!hasAnyFilters && (
            <p className="text-xs text-muted-foreground mt-1">
              Adicione contexto em um trade ou anote um dia no calendário.
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isTrade = item.type === "trade";
            const pnl = item.netPnl ?? 0;
            const isBuy = (item.direction ?? "").toLowerCase() === "buy";

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="group flex items-start gap-3 rounded-[18px] border border-border/50 p-4 transition-colors hover:bg-muted/30"
                style={{ backgroundColor: "hsl(var(--card))" }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isTrade
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  )}
                >
                  {isTrade ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <CalendarDays className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
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
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        Nota do dia
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

                {/* Delete */}
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
