"use client";

import { Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreak } from "@/hooks/useStreak";

interface StreakBadgeProps {
  userId: string | null | undefined;
  className?: string;
}

export function StreakBadge({ userId, className }: StreakBadgeProps) {
  const { currentStreak, longestStreak, isLoading } = useStreak(userId);

  if (isLoading) return null;

  // Don't show if no streak at all
  if (currentStreak === 0 && longestStreak === 0) return null;

  const level =
    currentStreak >= 30 ? "gold" :
    currentStreak >= 7 ? "hot" :
    currentStreak > 0 ? "warm" :
    "cold";

  const colors = {
    gold: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    hot: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    warm: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    cold: "bg-muted text-muted-foreground border-border/40",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Current streak */}
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
          colors[level]
        )}
      >
        <Flame className={cn(
          "h-3.5 w-3.5",
          level === "gold" && "text-amber-500",
          level === "hot" && "text-orange-500",
          level === "cold" && "text-muted-foreground",
        )} />
        {currentStreak > 0 ? (
          <span>{currentStreak} {currentStreak === 1 ? "dia" : "dias"}</span>
        ) : (
          <span className="text-muted-foreground">Streak perdida</span>
        )}
      </div>

      {/* Longest streak (only if > current and > 0) */}
      {longestStreak > currentStreak && longestStreak > 0 && (
        <div className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <Trophy className="h-3 w-3" />
          <span>Recorde: {longestStreak}d</span>
        </div>
      )}
    </div>
  );
}
