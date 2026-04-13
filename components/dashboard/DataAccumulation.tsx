"use client";

import { Database, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreak } from "@/hooks/useStreak";

interface DataAccumulationProps {
  userId: string | null | undefined;
  className?: string;
}

const MILESTONES = [10, 50, 100, 250, 500, 1000];

export function DataAccumulation({ userId, className }: DataAccumulationProps) {
  const { totalTrades, totalDays, firstTradeDate, isLoading } = useStreak(userId);

  if (isLoading || totalTrades === 0) return null;

  // Calculate months of data
  const monthsOfData = firstTradeDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(firstTradeDate).getTime()) / (30.44 * 86400000)))
    : 0;

  // Next milestone
  const nextMilestone = MILESTONES.find((m) => m > totalTrades) ?? totalTrades + 100;
  const prevMilestone = MILESTONES.filter((m) => m <= totalTrades).pop() ?? 0;
  const progress = ((totalTrades - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  return (
    <div
      className={cn(
        "rounded-[22px] border border-border/40 px-5 py-4 shadow-soft dark:shadow-soft-dark",
        className
      )}
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Stats row */}
      <div className="flex items-center gap-5 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{totalTrades}</span>
          <span>trades</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{totalDays}</span>
          <span>{totalDays === 1 ? "dia" : "dias"}</span>
        </div>
        {monthsOfData > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">{monthsOfData}</span>
            <span>{monthsOfData === 1 ? "mês" : "meses"} de dados</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {nextMilestone - totalTrades} para {nextMilestone}
        </span>
      </div>

      {/* Motivation text */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Seus analytics melhoram a cada trade logado.
      </p>
    </div>
  );
}
