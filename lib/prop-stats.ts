import { supabase } from "@/lib/supabase/client";

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
  const { data: { session } } = await supabase.auth.getSession();
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
