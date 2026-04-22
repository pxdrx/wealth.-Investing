"use client";

import { Briefcase, Calendar, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContextChipsProps {
  accountName: string | null;
  todayPnlUsd: number | null;
  openPositionsCount: number;
  nextEvent: { title: string; whenRelative: string } | null;
}

function formatUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  const abs = Math.abs(n);
  const formatted = abs >= 1000
    ? abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : abs.toFixed(2);
  return `${sign}${n < 0 ? "-" : ""}$${formatted}`;
}

export function ContextChips({
  accountName,
  todayPnlUsd,
  openPositionsCount,
  nextEvent,
}: ContextChipsProps) {
  const pnlTone =
    todayPnlUsd == null || todayPnlUsd === 0
      ? "border-border/60 bg-transparent text-muted-foreground"
      : todayPnlUsd > 0
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
        : "border-rose-500/30 bg-rose-500/15 text-rose-300";

  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
      {accountName && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          {accountName}
        </span>
      )}
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
          pnlTone,
        )}
      >
        <TrendingUp className="h-3.5 w-3.5" />
        {todayPnlUsd == null ? "Sem trades hoje" : `P&L hoje ${formatUsd(todayPnlUsd)}`}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground">
        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
        {openPositionsCount} {openPositionsCount === 1 ? "aberta" : "abertas"}
      </span>
      {nextEvent && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate max-w-[180px]">{nextEvent.title}</span>
          <span className="text-muted-foreground">· {nextEvent.whenRelative}</span>
        </span>
      )}
    </div>
  );
}
