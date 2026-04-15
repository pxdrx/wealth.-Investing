"use client";

import { Trash2, FileText, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type NoteKind = "trade" | "day";

export interface NoteRowItem {
  id: string;
  kind: NoteKind;
  date: string; // ISO or YYYY-MM-DD
  title: string;
  preview: string;
  tags: string[];
  // Extra context for trade notes
  symbol?: string | null;
  netPnl?: number | null;
}

interface NoteRowProps {
  item: NoteRowItem;
  onOpen: (item: NoteRowItem) => void;
  onDelete: (item: NoteRowItem) => void;
  deleting?: boolean;
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

export function NoteRow({ item, onOpen, onDelete, deleting }: NoteRowProps) {
  const isTrade = item.kind === "trade";
  const Icon = isTrade ? FileText : Calendar;
  const pnl = item.netPnl ?? 0;

  return (
    <div
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
        <Icon className="h-4 w-4" />
      </div>

      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isTrade ? "Por trade" : "Diária"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(item.date)}
          </span>
          {isTrade && item.symbol && (
            <span className="text-xs font-semibold">{item.symbol}</span>
          )}
          {isTrade && item.netPnl != null && (
            <span
              className={cn(
                "text-xs font-medium",
                pnl >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)} USD
            </span>
          )}
        </div>
        <p className="text-sm line-clamp-2 whitespace-pre-wrap">
          {item.preview || (
            <span className="text-muted-foreground italic">Sem texto</span>
          )}
        </p>
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 6).map((t, i) => (
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
        onClick={() => onDelete(item)}
        disabled={deleting}
        className="flex shrink-0 items-center gap-1.5 self-start rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
        aria-label="Excluir anotação"
        title="Excluir anotação"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
