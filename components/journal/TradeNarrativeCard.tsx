"use client";

import Image from "next/image";
import { formatDateTime, formatDuration, getNetPnl, type JournalTradeRow } from "./types";
import { DexterTradeDebrief } from "./DexterTradeDebrief";

interface Props {
  trade: JournalTradeRow;
  onOpenDetails: (trade: JournalTradeRow) => void;
  showPnl: boolean;
}

function formatPnl(n: number, hidden: boolean): string {
  if (hidden) return "••••";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function relativeFromNow(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < 0) return null;
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const days = Math.round(hr / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.round(days / 30);
  return `há ${months}m`;
}

function directionLabel(d: string): string {
  const lower = (d || "").toLowerCase();
  if (lower === "buy" || lower === "long") return "LONG";
  if (lower === "sell" || lower === "short") return "SHORT";
  return d?.toUpperCase() ?? "—";
}

export function TradeNarrativeCard({ trade, onOpenDetails, showPnl }: Props) {
  const netPnl = getNetPnl(trade);
  const positive = netPnl > 0;
  const negative = netPnl < 0;
  const pnlColor = positive
    ? "text-emerald-600 dark:text-emerald-400"
    : negative
    ? "text-rose-600 dark:text-rose-400"
    : "text-muted-foreground";

  const duration =
    trade.opened_at && trade.closed_at
      ? formatDuration(trade.opened_at, trade.closed_at)
      : "—";
  const relative = relativeFromNow(trade.closed_at || trade.opened_at);
  const tags = trade.custom_tags ?? [];

  return (
    <article
      className="rounded-[22px] border border-border/60 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="p-5 space-y-4">
        {/* Header: symbol + direction + time */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="inline-flex items-center rounded-full bg-foreground/90 px-2.5 py-0.5 text-xs font-semibold text-background">
            {trade.symbol}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              directionLabel(trade.direction) === "LONG"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            {directionLabel(trade.direction)}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {formatDateTime(trade.opened_at)} · {duration}
          </span>
          {relative && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{relative}</span>
            </>
          )}
        </div>

        {/* P&L headline + tags */}
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className={`text-2xl font-semibold tracking-tight tabular-nums ${pnlColor}`}>
              {formatPnl(netPnl, !showPnl)}
            </span>
            {typeof trade.rr_realized === "number" && (
              <span className="text-xs text-muted-foreground">
                R:R {trade.rr_realized >= 0 ? "+" : ""}
                {trade.rr_realized.toFixed(2)}
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Context / notes snippet */}
        {(trade.context || trade.notes) && (
          <p className="text-sm leading-relaxed text-foreground/80 line-clamp-2">
            {trade.context || trade.notes}
          </p>
        )}

        {/* Dexter debrief */}
        <DexterTradeDebrief tradeId={trade.id} />

        {/* Footer: screenshot + details */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {trade.screenshot_path && (
              <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border/60">
                <Image
                  src={trade.screenshot_path}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            {trade.external_source && (
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {trade.external_source}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenDetails(trade)}
            className="inline-flex items-center rounded-full border border-border/70 bg-transparent px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            Detalhes
          </button>
        </div>
      </div>
    </article>
  );
}
