import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";

// ── Drawdown Stats (RPC-based) ──────────────────────────────

export type DrawdownType = "static" | "trailing" | "eod";

export interface DrawdownStats {
  dailyPnl: number;
  overallPnl: number;
  highWaterMark: number;
  /** Equity à HWM considerando apenas balances EOD (broker TZ) */
  hwmEodUsd: number;
  startingBalance: number;
  drawdownType: DrawdownType;
  dailyDdPct: number;
  overallDdPct: number;
  /** USD floor abaixo do qual a conta breach-a (só relevante para EOD) */
  eodFloorUsd: number | null;
  /** True quando o trail lock disparou (floor permanente) */
  eodLocked: boolean;
}

/**
 * Calls the calc_drawdown Postgres RPC and computes drawdown percentages.
 * For static: dd% = loss / startingBalance
 * For trailing: dd% = loss / highWaterMark
 * For eod: floor = max(hwmEod, starting) - ddLimitUsd; se lock engaged, floor = trailLockedFloorUsd.
 */
export async function getDrawdownStats(
  client: SupabaseClient,
  accountId: string,
  userId: string,
  maxDailyLossPct: number,
  maxOverallLossPct: number,
  trailLockThresholdUsd?: number | null,
  trailLockedFloorUsd?: number | null
): Promise<DrawdownStats | null> {
  const { data, error } = await client.rpc("calc_drawdown", {
    p_account_id: accountId,
    p_user_id: userId,
  });

  if (error) {
    console.warn("[prop-stats] calc_drawdown RPC error:", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  const dailyPnl = Number(row.daily_pnl) || 0;
  const overallPnl = Number(row.overall_pnl) || 0;
  const highWaterMark = Number(row.high_water_mark) || 0;
  const hwmEodUsd = Number(row.hwm_eod_usd) || 0;
  const startingBalance = Number(row.starting_balance) || 0;
  const drawdownType = (row.drawdown_type as DrawdownType) || "static";

  if (startingBalance <= 0) {
    return {
      dailyPnl,
      overallPnl,
      highWaterMark,
      hwmEodUsd,
      startingBalance,
      drawdownType,
      dailyDdPct: 0,
      overallDdPct: 0,
      eodFloorUsd: null,
      eodLocked: false,
    };
  }

  // Daily is always measured against starting balance (intraday unaffected by type)
  const dailyDdPct =
    dailyPnl < 0
      ? Math.min(Math.abs(dailyPnl / startingBalance) * 100, maxDailyLossPct)
      : 0;

  let overallDdPct = 0;
  let eodFloorUsd: number | null = null;
  let eodLocked = false;

  if (drawdownType === "eod") {
    const ddLimitUsd = startingBalance * (maxOverallLossPct / 100);
    const hwmEodBalance = Math.max(hwmEodUsd, startingBalance);
    const currentBalance = startingBalance + overallPnl;
    const lockEngaged =
      trailLockThresholdUsd != null &&
      trailLockedFloorUsd != null &&
      hwmEodBalance >= trailLockThresholdUsd;
    eodLocked = lockEngaged;
    // Floor (breach line): trava permanente se lock engajado; senão trail HWM_EOD - dd_limit.
    const floorNonLocked = Math.max(
      hwmEodBalance - ddLimitUsd,
      startingBalance - ddLimitUsd
    );
    eodFloorUsd = lockEngaged ? (trailLockedFloorUsd as number) : floorNonLocked;
    // DD consumido = pullback do PICO (intraday HWM ∪ EOD HWM ∪ saldo atual).
    // Reflete a perspectiva do trader: "comeu X mil do meu colchão" mesmo que
    // saldo atual ainda esteja acima do floor — porque parte do lucro foi devolvida.
    const peak = Math.max(highWaterMark, hwmEodBalance, currentBalance);
    const ddConsumedUsd = Math.max(0, peak - currentBalance);
    overallDdPct = Math.min(
      maxOverallLossPct,
      (ddConsumedUsd / startingBalance) * 100
    );
    // Breach absoluto: se cruzou o floor, força 100% do limite.
    if (currentBalance <= eodFloorUsd) overallDdPct = maxOverallLossPct;
  } else if (drawdownType === "trailing") {
    const denom = highWaterMark > 0 ? highWaterMark : startingBalance;
    overallDdPct =
      overallPnl < 0
        ? Math.min(Math.abs(overallPnl / denom) * 100, maxOverallLossPct)
        : 0;
  } else {
    // static
    overallDdPct =
      overallPnl < 0
        ? Math.min(Math.abs(overallPnl / startingBalance) * 100, maxOverallLossPct)
        : 0;
  }

  return {
    dailyPnl,
    overallPnl,
    highWaterMark,
    hwmEodUsd,
    startingBalance,
    drawdownType,
    dailyDdPct,
    overallDdPct,
    eodFloorUsd,
    eodLocked,
  };
}

// ── Cycle Stats (legacy) ────────────────────────────────────

export interface PropCycleStats {
  /** Lucro do ciclo atual (após último payout) */
  profitSinceLastPayout: number;
  /** Lucro total histórico (soma de todos os trades) */
  totalHistorical: number;
  /** Data do último payout, se houver */
  lastPayoutAt: string | null;
}

const EMPTY_STATS: PropCycleStats = {
  profitSinceLastPayout: 0,
  totalHistorical: 0,
  lastPayoutAt: null,
};

/**
 * Calcula lucro do ciclo (após último prop_payout) e total histórico para a conta prop.
 * Recebe accountId (accounts.id), resolve prop_accounts.id; usa net_pnl_usd em journal_trades.
 * Ciclo = soma de net_pnl_usd com closed_at > lastPayoutAt; sem payout, ciclo = total histórico.
 */
export async function getPropCycleStats(accountId: string): Promise<PropCycleStats> {
  const { data: { session } } = await safeGetSession();
  if (!session?.user?.id) {
    return EMPTY_STATS;
  }
  const userId = session.user.id;

  const { data: propAccount, error: propError } = await supabase
    .from("prop_accounts")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (propError) {
    const code = (propError as { code?: string }).code;
    const schemaHint =
      code === "42703"
        ? " (schema incompatível: confira se prop_accounts.user_id existe no banco)"
        : "";
    console.warn("[prop-stats] prop_accounts lookup error:", propError.message + schemaHint);
    return EMPTY_STATS;
  }
  const propAccountId = (propAccount as { id?: string } | null)?.id ?? null;
  if (!propAccountId) {
    return EMPTY_STATS;
  }

  const { data: lastPayout, error: payoutError } = await supabase
    .from("prop_payouts")
    .select("paid_at")
    .eq("prop_account_id", propAccountId)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payoutError) {
    console.warn("[prop-stats] prop_payouts lookup error:", payoutError.message);
  }
  const lastPaidAt =
    (lastPayout as { paid_at?: string } | null)?.paid_at ?? null;

  const { data: trades, error: tradesError } = await supabase
    .from("journal_trades")
    .select("closed_at, net_pnl_usd")
    .eq("user_id", userId)
    .eq("account_id", accountId);

  if (tradesError) {
    console.warn("[prop-stats] journal_trades lookup error:", tradesError.message);
    return {
      ...EMPTY_STATS,
      lastPayoutAt: lastPaidAt,
    };
  }

  const rows = (trades ?? []) as { closed_at: string | null; net_pnl_usd: number | null }[];
  let totalHistorical = 0;
  let profitSinceLastPayout = 0;
  const lastPaidAtDate = lastPaidAt ? new Date(lastPaidAt) : null;

  for (const row of rows) {
    const pnl =
      typeof row.net_pnl_usd === "number" && !Number.isNaN(row.net_pnl_usd)
        ? row.net_pnl_usd
        : 0;
    totalHistorical += pnl;
    if (lastPaidAtDate && row.closed_at) {
      if (new Date(row.closed_at) > lastPaidAtDate) {
        profitSinceLastPayout += pnl;
      }
    } else if (!lastPaidAtDate) {
      profitSinceLastPayout += pnl;
    }
  }

  return {
    profitSinceLastPayout,
    totalHistorical,
    lastPayoutAt: lastPaidAt,
  };
}
