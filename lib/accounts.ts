import { supabase } from "@/lib/supabase/client";

export type AccountKind = "prop" | "personal" | "crypto" | "backtest";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  is_active: boolean;
  created_at?: string;
  starting_balance_usd?: number | null;
}

export type PropPhase = "phase_1" | "phase_2" | "funded";

export interface PropAccountRow {
  account_id: string;
  firm_name: string;
  phase: PropPhase;
  starting_balance_usd: number;
  profit_target_percent: number;
  max_daily_loss_percent: number;
  max_overall_loss_percent: number;
  reset_timezone: string;
  reset_rule: string;
  drawdown_type: "static" | "trailing";
}

export interface AccountWithProp extends Account {
  prop?: PropAccountRow;
}

const KIND_ORDER: Record<AccountKind, number> = {
  prop: 0,
  personal: 1,
  crypto: 2,
  backtest: 3,
};

function sortAccounts(a: Account, b: Account): number {
  if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
  const kindA = KIND_ORDER[a.kind] ?? 99;
  const kindB = KIND_ORDER[b.kind] ?? 99;
  if (kindA !== kindB) return kindA - kindB;
  const createdA = a.created_at ?? "";
  const createdB = b.created_at ?? "";
  return createdA.localeCompare(createdB);
}

/**
 * Lista contas do usuário atual (id, name, kind), ordenadas: prop → personal → crypto.
 */
export async function listMyAccounts(): Promise<Account[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, kind, is_active, created_at, starting_balance_usd")
    .eq("user_id", session.user.id);

  if (error) {
    console.warn("[accounts] listMyAccounts error:", error.message);
    return [];
  }

  const list = (data ?? []) as Account[];
  return list.slice().sort(sortAccounts);
}

/**
 * Lista contas do usuário com dados de prop_accounts quando kind='prop'.
 * Ordenação: is_active desc, kind (prop primeiro), created_at.
 */
export async function listMyAccountsWithProp(): Promise<AccountWithProp[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data: rows, error } = await supabase
    .from("accounts")
    .select("id, name, kind, is_active, created_at, starting_balance_usd")
    .eq("user_id", session.user.id);

  if (error) {
    console.warn("[accounts] listMyAccountsWithProp error:", error.message);
    return [];
  }

  const accounts = (rows ?? []) as Account[];
  const sorted = accounts.slice().sort(sortAccounts);

  const propIds = sorted.filter((a) => a.kind === "prop").map((a) => a.id);
  if (propIds.length === 0) {
    return sorted as AccountWithProp[];
  }

  const { data: propRows } = await supabase
    .from("prop_accounts")
    .select("account_id, firm_name, phase, starting_balance_usd, profit_target_percent, max_daily_loss_percent, max_overall_loss_percent, reset_timezone, reset_rule, drawdown_type")
    .in("account_id", propIds);

  const propByAccountId = new Map<string, PropAccountRow>();
  for (const row of propRows ?? []) {
    propByAccountId.set((row as PropAccountRow).account_id, row as PropAccountRow);
  }

  return sorted.map((acc) => ({
    ...acc,
    prop: acc.kind === "prop" ? propByAccountId.get(acc.id) : undefined,
  })) as AccountWithProp[];
}

export function phaseLabel(phase: PropPhase): string {
  const labels: Record<PropPhase, string> = {
    phase_1: "Phase 1",
    phase_2: "Phase 2",
    funded: "Funded",
  };
  return labels[phase] ?? phase;
}
