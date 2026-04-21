"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { usePrivacy } from "@/components/context/PrivacyContext";
import type { JournalTradeKpiRow } from "@/hooks/useDashboardData";

export function StreaksWidget({ trades }: { trades: JournalTradeKpiRow[] }) {
  const { mask } = usePrivacy();

  const streakData = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.opened_at)
      .sort((a, b) => a.opened_at!.localeCompare(b.opened_at!));

    let currentStreak = 0;
    let currentType: "W" | "L" = "W";
    let maxWin = 0;
    let maxLoss = 0;
    let tempStreak = 0;
    let tempType: "W" | "L" | null = null;

    for (const t of sorted) {
      const net = t.net_pnl_usd ?? 0;
      const type: "W" | "L" = net >= 0 ? "W" : "L";

      if (type === tempType) {
        tempStreak += 1;
      } else {
        tempType = type;
        tempStreak = 1;
      }

      if (type === "W" && tempStreak > maxWin) maxWin = tempStreak;
      if (type === "L" && tempStreak > maxLoss) maxLoss = tempStreak;

      currentStreak = tempStreak;
      currentType = type;
    }

    return { currentStreak, currentType, maxWin, maxLoss };
  }, [trades]);

  const isWin = streakData.currentType === "W";

  return (
    <div
      className="rounded-[22px] border overflow-hidden h-full flex flex-col"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Sequências
        </h3>
        <Flame className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Atual
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{
              color: isWin ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))",
            }}
          >
            {mask(`${streakData.currentStreak}${streakData.currentType}`)}
          </p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Max Win
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{ color: "hsl(var(--pnl-positive))" }}
          >
            {mask(`${streakData.maxWin}W`)}
          </p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Max Loss
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{ color: "hsl(var(--pnl-negative))" }}
          >
            {mask(`${streakData.maxLoss}L`)}
          </p>
        </div>
      </div>
    </div>
  );
}
