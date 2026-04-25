"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSafetyTimeout } from "@/hooks/useSafetyTimeout";
import { useDashboardData } from "@/hooks/useDashboardData";

const AccountsOverview = dynamic(
  () =>
    import("@/components/dashboard/AccountsOverview").then((m) => ({
      default: m.AccountsOverview,
    })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { getPropCycleStats, getDrawdownStats, type PropCycleStats, type DrawdownStats } from "@/lib/prop-stats";
import { type PropAccountRow, phaseLabel } from "@/lib/accounts";
import { DrawdownBar } from "@/components/prop/DrawdownBar";
import { StaleBadge } from "@/components/prop/StaleBadge";
import { EditAccountRulesDrawer } from "@/components/account/EditAccountRulesDrawer";
import { PropFirmsOverview } from "@/components/prop/PropFirmsOverview";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, TrendingUp, Pencil } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";

const RISCO_THRESHOLD_PCT = 70;

interface PropCardData {
  accountId: string;
  accountName: string;
  propInfo: PropAccountRow;
  cycleStats: PropCycleStats;
  drawdownStats: DrawdownStats | null;
  lastTradeAt: string | null;
}

export default function PropPage() {
  const t = useAppT();
  const { accounts, refreshAccounts } = useActiveAccount();
  const propAccounts = accounts.filter((a) => a.kind === "prop" && a.is_active);

  // Overview card inputs (C-05 relocation — widget moved from /app home).
  const dashData = useDashboardData();
  const overviewAccounts = useMemo(
    () =>
      Array.from(dashData.accountsById.values())
        .filter((a) => a.kind !== "backtest")
        .map((a) => ({ id: a.id, name: a.name, kind: a.kind, is_active: a.is_active })),
    [dashData.accountsById],
  );
  const overviewTrades = useMemo(
    () =>
      dashData.journalTrades
        .filter(
          (t) =>
            t.account_id !== null &&
            t.opened_at !== null &&
            t.direction !== null,
        )
        .map((t) => ({
          account_id: t.account_id as string,
          pnl_usd: t.net_pnl_usd ?? 0,
          net_pnl_usd: t.net_pnl_usd ?? 0,
          direction: t.direction as "long" | "short",
          opened_at: t.opened_at as string,
        })),
    [dashData.journalTrades],
  );

  const [cardsData, setCardsData] = useState<PropCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useSafetyTimeout(loading, setLoading, "prop");

  const fetchAllPropData = useCallback(async () => {
    if (propAccounts.length === 0) {
      setLoading(false);
      setCardsData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError(t("prop.errSession"));
        setLoading(false);
        return;
      }
      const userId = session.user.id;

      const results = await Promise.all(
        propAccounts.map(async (account) => {
          try {
            const propInfo = account.prop;
            if (!propInfo) return null;

            const [cycleStats, drawdownStats, lastTradeRes] = await Promise.all([
              getPropCycleStats(account.id),
              getDrawdownStats(
                supabase,
                account.id,
                userId,
                propInfo.max_daily_loss_percent,
                propInfo.max_overall_loss_percent,
                propInfo.trail_lock_threshold_usd,
                propInfo.trail_locked_floor_usd
              ),
              supabase
                .from("journal_trades")
                .select("closed_at")
                .eq("account_id", account.id)
                .eq("user_id", userId)
                .order("closed_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);

            const lastTradeAt = (lastTradeRes.data as { closed_at?: string } | null)?.closed_at ?? null;

            return {
              accountId: account.id,
              accountName: account.name,
              propInfo,
              cycleStats,
              drawdownStats,
              lastTradeAt,
            } as PropCardData;
          } catch {
            return null;
          }
        })
      );

      setCardsData(results.filter((r): r is PropCardData => r !== null));
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("prop.errGeneric"));
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propAccounts.map((a) => a.id).join(",")]);

  useEffect(() => {
    fetchAllPropData();
  }, [fetchAllPropData]);

  // ---------- No prop accounts ----------
  if (!loading && propAccounts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("prop.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("prop.page.subtitle")}
          </p>
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("prop.empty")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("prop.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("prop.page.subtitle")}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: propAccounts.length || 2 }).map((_, i) => (
            <Card key={i} className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-40 rounded bg-muted" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-3 w-24 rounded bg-muted" />
                        <div className="h-6 w-32 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("prop.page.title")}
          </h1>
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 overflow-x-hidden">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("prop.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("prop.page.subtitleWithCount")
            .replace("{count}", String(cardsData.length))
            .replace(/\{s\}/g, cardsData.length !== 1 ? "s" : "")}
        </p>
      </div>

      {/* Accounts snapshot (relocated from /app home — C-05) */}
      <div className="mb-8">
        <AccountsOverview
          accounts={overviewAccounts}
          propAccounts={dashData.propAccounts}
          trades={overviewTrades}
          propPayoutsTotal={dashData.propPayoutsTotal}
        />
      </div>

      {/* [C-13] Firm-level rollup above per-account cards */}
      <PropFirmsOverview cards={cardsData} />

      <div className="grid gap-6 lg:grid-cols-2">
        {cardsData.map((card) => (
          <PropAccountCard
            key={card.accountId}
            data={card}
            onRulesChanged={async () => {
              await refreshAccounts();
              await fetchAllPropData();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PropAccountCard({ data, onRulesChanged }: { data: PropCardData; onRulesChanged: () => Promise<void> }) {
  const t = useAppT();
  const { propInfo, cycleStats, drawdownStats, accountName, lastTradeAt, accountId } = data;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const startingBalance = propInfo.starting_balance_usd;
  const profitTargetPct = propInfo.profit_target_percent;
  const maxDailyLossPct = propInfo.max_daily_loss_percent;
  const maxOverallLossPct = propInfo.max_overall_loss_percent;

  const profitTarget = startingBalance * (profitTargetPct / 100);
  const maxDailyLoss = startingBalance * (maxDailyLossPct / 100);
  const maxOverallLoss = startingBalance * (maxOverallLossPct / 100);

  const profit = cycleStats.profitSinceLastPayout;
  const remainingToTarget = Math.max(0, profitTarget - profit);

  const dailyDdPct = drawdownStats?.dailyDdPct ?? 0;
  const overallDdPct = drawdownStats?.overallDdPct ?? 0;
  const hwm = drawdownStats?.highWaterMark ?? startingBalance;
  const hwmEod = drawdownStats?.hwmEodUsd ?? startingBalance;
  const currentEquity = startingBalance + profit;
  let overallLossUsed = 0;
  if (propInfo.drawdown_type === "trailing") {
    overallLossUsed = Math.max(0, hwm - currentEquity);
  } else if (propInfo.drawdown_type === "eod") {
    // EOD: pullback do pico (intraday HWM ∪ EOD HWM ∪ saldo atual).
    const peak = Math.max(hwm, hwmEod, startingBalance, currentEquity);
    overallLossUsed = Math.max(0, peak - currentEquity);
  } else {
    overallLossUsed = Math.max(0, -profit);
  }
  const overallDistance = Math.max(0, maxOverallLoss - overallLossUsed);
  const overallDdUsedPctOfLimit =
    maxOverallLoss > 0 ? Math.min(100, (overallLossUsed / maxOverallLoss) * 100) : 0;

  const metaProgressPct = profitTarget > 0 ? Math.min(100, (profit / profitTarget) * 100) : 0;
  const ddTypeLabel =
    propInfo.drawdown_type === "trailing"
      ? t("prop.dd.trailing")
      : propInfo.drawdown_type === "eod"
      ? t("prop.dd.eod")
      : t("prop.dd.static");

  const status: "ok" | "risco" = overallDdPct >= RISCO_THRESHOLD_PCT ? "risco" : "ok";

  return (
    <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-medium">{accountName}</CardTitle>
          <CardDescription>
            {propInfo.firm_name} · {phaseLabel(propInfo.phase)} · ${startingBalance.toLocaleString()} · DD {ddTypeLabel}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <StaleBadge lastTradeAt={lastTradeAt} />
          {status === "ok" ? (
            <Badge variant="success">{t("prop.status.ok")}</Badge>
          ) : (
            <Badge variant="warning">{t("prop.status.risk")}</Badge>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={t("prop.editRules")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t("prop.kpi.profitCurrent")}
            </p>
            <p className={`text-lg font-bold tabular-nums ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {profit >= 0 ? "+" : ""}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("prop.kpi.toTarget")}</p>
            <p className="text-lg font-bold tabular-nums">${remainingToTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("prop.kpi.overallDistance")}</p>
            <p className="text-lg font-bold tabular-nums">${overallDistance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("prop.kpi.lastPayout")}</p>
            <p className="text-lg font-bold">
              {cycleStats.lastPayoutAt
                ? new Date(cycleStats.lastPayoutAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : t("prop.kpi.lastPayoutNone")}
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("prop.target.label").replace("{target}", profitTarget.toLocaleString())}</span>
            <span className="font-medium tabular-nums">
              ${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${profitTarget.toLocaleString()}
            </span>
          </div>
          <Progress value={Math.max(0, metaProgressPct)} max={100} className="mt-2" />
        </div>

        <Separator />

        <div className="space-y-3">
          <DrawdownBar
            label={t("prop.dd.daily")}
            currentPct={dailyDdPct}
            maxPct={maxDailyLossPct}
          />
          <DrawdownBar
            label={t("prop.dd.overall")}
            currentPct={overallDdPct}
            maxPct={maxOverallLossPct}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            DD usado: ${overallLossUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {" "}de ${maxOverallLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {" "}({overallDdUsedPctOfLimit.toFixed(0)}% do limite)
          </p>
        </div>
      </CardContent>
      <EditAccountRulesDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        accountId={accountId}
        accountName={accountName}
        prop={propInfo}
        onSaved={onRulesChanged}
      />
    </Card>
  );
}
