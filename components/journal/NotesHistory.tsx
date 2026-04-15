"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { NoteRow, type NoteRowItem } from "./NoteRow";
import type { JournalTradeRow } from "./types";

const easeApple = [0.16, 1, 0.3, 1] as const;

type FilterKind = "all" | "day" | "trade";

interface NotesHistoryProps {
  userId: string | null;
  accountId: string | null;
  trades: JournalTradeRow[];
  onChanged?: () => void;
}

interface DayNoteRow {
  id: string;
  date: string;
  observation: string | null;
  tags: unknown;
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

export function NotesHistory({ userId, accountId, trades, onChanged }: NotesHistoryProps) {
  const [dayNotes, setDayNotes] = useState<DayNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("day_notes")
        .select("id, date, observation, tags")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (!cancelled) {
        if (error) {
          setDayNotes([]);
        } else {
          setDayNotes((data ?? []) as DayNoteRow[]);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const items = useMemo<NoteRowItem[]>(() => {
    const list: NoteRowItem[] = [];

    // Day notes — include all that have observation OR tags
    for (const n of dayNotes) {
      const tags = coerceTags(n.tags);
      const obs = (n.observation ?? "").trim();
      if (!obs && tags.length === 0) continue;
      list.push({
        id: n.id,
        kind: "day",
        date: n.date,
        title: `Anotação de ${n.date}`,
        preview: obs,
        tags,
      });
    }

    // Trade notes — trades with context or custom_tags
    for (const t of trades) {
      const ctx = (t.context ?? "").trim();
      const tags = Array.isArray(t.custom_tags) ? t.custom_tags.filter(Boolean) : [];
      if (!ctx && tags.length === 0) continue;
      list.push({
        id: t.id,
        kind: "trade",
        date: t.closed_at || t.opened_at,
        title: `${t.symbol} · ${t.direction}`,
        preview: ctx,
        tags,
        symbol: t.symbol,
        netPnl:
          typeof t.net_pnl_usd === "number"
            ? t.net_pnl_usd
            : (t.pnl_usd ?? 0) + (t.fees_usd ?? 0),
      });
    }

    list.sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return bTime - aTime;
    });
    return list;
  }, [dayNotes, trades]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      day: items.filter((i) => i.kind === "day").length,
      trade: items.filter((i) => i.kind === "trade").length,
    }),
    [items]
  );

  async function handleDelete(item: NoteRowItem) {
    if (!userId) return;
    const label =
      item.kind === "day"
        ? "Excluir esta anotação diária? Esta ação não pode ser desfeita."
        : "Limpar contexto e tags deste trade? O trade em si não será excluído.";
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
          .update({ context: null, custom_tags: null })
          .eq("id", item.id)
          .eq("user_id", userId);
        if (error) throw error;
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
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "Todas" },
            { key: "day", label: "Diárias" },
            { key: "trade", label: "Por trade" },
          ] as { key: FilterKind; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (filter === f.key
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 text-muted-foreground hover:text-foreground")
            }
          >
            {f.label}
            <span
              className={
                "rounded-full px-1.5 text-[10px] " +
                (filter === f.key ? "bg-background/20" : "bg-muted")
              }
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
        {toast && (
          <span className="ml-auto text-xs text-muted-foreground">{toast}</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card
          className="rounded-[22px] p-10 text-center"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <NotebookPen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma anotação {filter === "day" ? "diária" : filter === "trade" ? "por trade" : ""} por aqui.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione contexto em um trade ou uma nota no calendário para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <NoteRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onOpen={() => {
                /* no-op for now — could open modal in a future pass */
              }}
              onDelete={handleDelete}
              deleting={deletingId === item.id}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
