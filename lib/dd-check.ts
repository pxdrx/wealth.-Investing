import type { SupabaseClient } from "@supabase/supabase-js";

interface DdBreachResult {
  breached: boolean;
  accountName: string;
  ddPercent: number;
  ddLimit: number;
  date: string;
}

/**
 * Check if daily drawdown limit is breached for a prop account.
 * If breached, deactivates the account.
 * Returns breach info for UI notification.
 */
export async function checkAndDeactivateIfDdBreached(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
): Promise<DdBreachResult | null> {
  // 1. Get prop account details
  const { data: propAccount } = await supabase
    .from("prop_accounts")
    .select("starting_balance_usd, max_daily_loss_percent")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!propAccount?.max_daily_loss_percent || !propAccount?.starting_balance_usd) {
    return null; // Not a prop account or no DD limit configured
  }

  // 2. Get account name
  const { data: account } = await supabase
    .from("accounts")
    .select("name, is_active")
    .eq("id", accountId)
    .maybeSingle();

  if (!account?.is_active) return null; // Already deactivated

  // 3. Calculate today's net PnL
  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data: trades } = await supabase
    .from("journal_trades")
    .select("net_pnl_usd")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .gte("opened_at", startOfDay)
    .lte("opened_at", endOfDay);

  if (!trades || trades.length === 0) return null;

  const todayPnl = trades.reduce((sum, t) => sum + (t.net_pnl_usd ?? 0), 0);
  if (todayPnl >= 0) return null; // Positive day, no breach

  const ddPercent = (Math.abs(todayPnl) / propAccount.starting_balance_usd) * 100;

  if (ddPercent < propAccount.max_daily_loss_percent) return null; // Within limits

  // 4. BREACH DETECTED — Deactivate account
  await supabase
    .from("accounts")
    .update({ is_active: false })
    .eq("id", accountId)
    .eq("user_id", userId);

  return {
    breached: true,
    accountName: account.name,
    ddPercent,
    ddLimit: propAccount.max_daily_loss_percent,
    date: today,
  };
}
