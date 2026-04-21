"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEntitlements } from "@/hooks/use-entitlements";
import { TodayMatters } from "@/components/dashboard/TodayMatters";
import { DayKpis } from "@/components/dashboard/DayKpis";
import { DayTimeline } from "@/components/dashboard/DayTimeline";
import { SmartAlertsBanner } from "@/components/dashboard/SmartAlertsBanner";
import { LiveLockCard } from "@/components/live/LiveLockCard";
import type { TradeInput } from "@/lib/smart-alerts";

// Live surfaces are Ultra-gated inside each component; mount as dynamic to keep
// the home tree quiet for free users.
const LiveAlertsBanner = dynamic(
  () => import("@/components/live/LiveAlertsBanner").then((m) => ({ default: m.LiveAlertsBanner })),
  { ssr: false },
);
const LiveMonitoringWidget = dynamic(
  () => import("@/components/live/LiveMonitoringWidget").then((m) => ({ default: m.LiveMonitoringWidget })),
  { ssr: false },
);

export default function AppHome() {
  const { activeAccountId } = useActiveAccount();
  const { journalTrades, propAccounts, accountsById } = useDashboardData();
  // [C-12] Gate MT5 Live monitoring surfaces behind Ultra tier.
  const entitlements = useEntitlements();
  const canLive = entitlements.hasAccess("liveMonitoring");

  // SmartAlertsBanner analyzes real (non-backtest) trades. Keep this tiny —
  // every other widget on this page fetches its own data.
  const realAccountIds = useMemo(() => {
    const ids = new Set<string>();
    accountsById.forEach((acc, id) => {
      if (acc.kind !== "backtest") ids.add(id);
    });
    return ids;
  }, [accountsById]);

  const realTrades = useMemo(
    () => journalTrades.filter((t) => realAccountIds.has(t.account_id ?? "")),
    [journalTrades, realAccountIds],
  );

  const activePropAccount = useMemo(
    () => (activeAccountId ? propAccounts.find((p) => p.account_id === activeAccountId) : null) ?? null,
    [activeAccountId, propAccounts],
  );

  const dailyDdLimit =
    activePropAccount?.max_daily_loss_percent && activePropAccount?.starting_balance_usd
      ? (activePropAccount.max_daily_loss_percent / 100) * activePropAccount.starting_balance_usd
      : null;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TodayMatters />
      <DayKpis />
      <DayTimeline />
      <SmartAlertsBanner
        trades={realTrades as unknown as TradeInput[]}
        dailyDdLimit={dailyDdLimit}
      />
      {canLive ? (
        <>
          <LiveAlertsBanner />
          <LiveMonitoringWidget propAccount={activePropAccount} />
        </>
      ) : (
        <LiveLockCard />
      )}
    </div>
  );
}
