"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, ChevronDown } from "lucide-react";
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
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
          <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">Performance</h3>
        </div>

        {/* Account selector */}
        <div className="relative">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className={cn(
              "appearance-none rounded-full border border-border/60 bg-transparent",
              "pl-3 pr-7 py-1.5 text-[11px] font-medium text-muted-foreground",
              "hover:text-foreground hover:border-foreground/20 transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "cursor-pointer"
            )}
          >
            <option value="all">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
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
