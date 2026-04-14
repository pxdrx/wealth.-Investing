import type { SupabaseClient } from "@supabase/supabase-js";

export interface LastAccountStats {
  accountId: string;
  accountName: string;
  balance: number;
  netPnl: number;
  totalTrades: number;
  winRate: number;
  lastTradeDate: string;
}

export interface AccountKpi {
  accountId: string;
  accountName: string;
  kind: string;
  balance: number;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  pnlMonth: number;
  lastTradeDate: string | null;
}

const KIND_ORDER: Record<string, number> = {
  prop: 0,
  personal: 1,
  crypto: 2,
  backtest: 3,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function calculateAccountBalance(
  svc: SupabaseClient,
  accountId: string,
  startingBalance: number,
): Promise<number> {
  const { data: trades } = await svc
    .from("journal_trades")
    .select("net_pnl_usd")
    .eq("account_id", accountId);

  const sumNet = (trades ?? []).reduce(
    (s: number, t: { net_pnl_usd: number | null }) => s + (t.net_pnl_usd ?? 0),
    0,
  );
  return round2((startingBalance ?? 0) + sumNet);
}

export async function getStudentLastUsedAccount(
  svc: SupabaseClient,
  userId: string,
): Promise<LastAccountStats | null> {
  const { data: lastTradeRow } = await svc
    .from("journal_trades")
    .select("account_id, closed_at")
    .eq("user_id", userId)
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastTradeRow?.account_id) return null;

  const accountId = lastTradeRow.account_id as string;

  const { data: accRow } = await svc
    .from("accounts")
    .select("id, name, starting_balance_usd")
    .eq("id", accountId)
    .maybeSingle();

  if (!accRow) return null;

  const { data: trades } = await svc
    .from("journal_trades")
    .select("net_pnl_usd, closed_at")
    .eq("account_id", accountId)
    .eq("user_id", userId);

  const list = (trades ?? []) as { net_pnl_usd: number | null; closed_at: string | null }[];
  const totalTrades = list.length;
  const netPnl = list.reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0);
  const wins = list.filter((t) => (t.net_pnl_usd ?? 0) > 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const balance = (accRow.starting_balance_usd ?? 0) + netPnl;
  const lastTradeDate = (lastTradeRow.closed_at as string) ?? "";

  return {
    accountId,
    accountName: accRow.name as string,
    balance: round2(balance),
    netPnl: round2(netPnl),
    totalTrades,
    winRate: round2(winRate),
    lastTradeDate,
  };
}

export async function getStudentKpisByAccount(
  svc: SupabaseClient,
  userId: string,
): Promise<AccountKpi[]> {
  const { data: accountsRows } = await svc
    .from("accounts")
    .select("id, name, kind, is_active, created_at, starting_balance_usd")
    .eq("user_id", userId);

  const accounts = (accountsRows ?? []) as Array<{
    id: string;
    name: string;
    kind: string;
    is_active: boolean;
    created_at: string | null;
    starting_balance_usd: number | null;
  }>;

  const sorted = accounts.slice().sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    const ka = KIND_ORDER[a.kind] ?? 99;
    const kb = KIND_ORDER[b.kind] ?? 99;
    if (ka !== kb) return ka - kb;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  const { data: tradesRows } = await svc
    .from("journal_trades")
    .select("account_id, net_pnl_usd, closed_at")
    .eq("user_id", userId);

  const trades = (tradesRows ?? []) as Array<{
    account_id: string;
    net_pnl_usd: number | null;
    closed_at: string | null;
  }>;

  const monthStart = monthStartIso();
  const byAccount = new Map<string, { net_pnl_usd: number | null; closed_at: string | null }[]>();
  for (const t of trades) {
    const arr = byAccount.get(t.account_id) ?? [];
    arr.push(t);
    byAccount.set(t.account_id, arr);
  }

  return sorted.map((acc) => {
    const list = byAccount.get(acc.id) ?? [];
    const totalTrades = list.length;
    const netPnl = list.reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0);
    const wins = list.filter((t) => (t.net_pnl_usd ?? 0) > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const pnlMonth = list
      .filter((t) => t.closed_at && t.closed_at >= monthStart)
      .reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0);
    const lastTradeDate = list
      .map((t) => t.closed_at)
      .filter((d): d is string => !!d)
      .sort((a, b) => (a > b ? -1 : 1))[0] ?? null;

    return {
      accountId: acc.id,
      accountName: acc.name,
      kind: acc.kind,
      balance: round2((acc.starting_balance_usd ?? 0) + netPnl),
      totalTrades,
      winRate: round2(winRate),
      netPnl: round2(netPnl),
      pnlMonth: round2(pnlMonth),
      lastTradeDate,
    };
  });
}
