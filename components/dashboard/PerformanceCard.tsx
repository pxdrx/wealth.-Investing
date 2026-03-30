"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeRow, DayNote } from "@/components/calendar/types";

interface PropAccountRef {
  account_id: string;
  starting_balance_usd: number;
}

const CalendarPnl = dynamic(
  () => import("@/components/calendar/CalendarPnl").then((m) => ({ default: m.CalendarPnl })),
  { ssr: false, loading: () => <div className="h-[260px] w-full rounded-xl bg-muted animate-pulse" /> },
);

const MonthlyPerformanceGrid = dynamic(
  () => import("@/components/dashboard/MonthlyPerformanceGrid").then((m) => ({ default: m.MonthlyPerformanceGrid })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);

interface PerformanceCardProps {
  trades: TradeRow[];
  accounts: { id: string; name: string }[];
  dayNotes?: Record<string, DayNote>;
  userId?: string | null;
  propAccounts?: PropAccountRef[];
  startingBalance: number | null;
  onTradeDeleted?: () => void;
}

export function PerformanceCard({
  trades,
  accounts,
  dayNotes,
  userId,
  propAccounts,
  startingBalance,
  onTradeDeleted,
}: PerformanceCardProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | "all">("all");

  // Filter trades by selected account
  const filteredTrades = useMemo(() => {
    if (selectedAccountId === "all") return trades;
    return trades.filter((t) => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId]);

  // Determine starting balance for selected account
  const effectiveStartingBalance = useMemo(() => {
    if (selectedAccountId === "all") return null;
    // Check prop_accounts first
    const prop = propAccounts?.find((p) => p.account_id === selectedAccountId);
    if (prop?.starting_balance_usd) return prop.starting_balance_usd;
    // No prop match — pass through the parent's starting balance only if it matches
    return startingBalance;
  }, [selectedAccountId, propAccounts, startingBalance]);

  // Accounts for calendar (show breakdown only in "all" mode)
  const calendarAccounts = selectedAccountId === "all" ? accounts : undefined;

  return (
    <div
      className="rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">Performance</h3>
        </div>

        {/* Account selector pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedAccountId("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
              selectedAccountId === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            Todas
          </button>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedAccountId(a.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                selectedAccountId === a.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Calendar (full mode with KPI strip) */}
        <CalendarPnl
          trades={filteredTrades}
          accounts={calendarAccounts}
          dayNotes={dayNotes}
          userId={userId}
          accountId={selectedAccountId === "all" ? null : selectedAccountId}
          accountIds={accounts.map((a) => a.id)}
          onTradeDeleted={onTradeDeleted}
        />

        {/* Monthly Performance Grid */}
        <div className="pt-3">
          <MonthlyPerformanceGrid
            trades={filteredTrades}
            activeAccountId={selectedAccountId === "all" ? null : selectedAccountId}
            startingBalance={effectiveStartingBalance}
          />
        </div>
      </div>
    </div>
  );
}
