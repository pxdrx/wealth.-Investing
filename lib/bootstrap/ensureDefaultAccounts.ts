import { supabase } from "@/lib/supabase/client";

const DEFAULTS = [
  {
    name: "The5ers 100k — Phase 1",
    kind: "prop" as const,
    is_active: true,
    prop: {
      firm_name: "The5ers",
      phase: "phase_1" as const,
      starting_balance_usd: 100_000,
      profit_target_percent: 8,
      max_daily_loss_percent: 5,
      max_overall_loss_percent: 10,
      reset_timezone: "America/New_York",
      reset_rule: "forex_close",
    },
  },
  {
    name: "FTMO 110k — Phase 1",
    kind: "prop" as const,
    is_active: false,
    prop: {
      firm_name: "FTMO",
      phase: "phase_1" as const,
      starting_balance_usd: 110_000,
      profit_target_percent: 10,
      max_daily_loss_percent: 5,
      max_overall_loss_percent: 10,
      reset_timezone: "America/New_York",
      reset_rule: "forex_close",
    },
  },
  { name: "Pessoal", kind: "personal" as const, is_active: true },
  { name: "Crypto Fund Trader", kind: "crypto" as const, is_active: true },
];

export const DEFAULT_ACCOUNTS = DEFAULTS;

/**
 * Garante as 4 contas padrão e prop_accounts para contas prop.
 * Idempotente: não duplica; se conta existe mas falta prop_accounts, cria.
 */
export async function ensureDefaultAccounts(userId: string): Promise<{ ok: boolean }> {
  const { data: existing, error: fetchError } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("user_id", userId);

  if (fetchError) {
    console.warn("[bootstrap] Could not fetch accounts:", fetchError.message);
    return { ok: false };
  }

  type Row = { id: string; name: string; kind: string };
  const existingList = (existing ?? []) as Row[];
  const byName = new Map(existingList.map((r) => [r.name, r]));
  const propAccountIds = new Set(existingList.filter((r) => r.kind === "prop").map((r) => r.id));

  let propIdsWithRow: string[] = [];
  if (propAccountIds.size > 0) {
    const { data: propRows } = await supabase
      .from("prop_accounts")
      .select("account_id")
      .eq("user_id", userId)
      .in("account_id", Array.from(propAccountIds));
    propIdsWithRow = (propRows ?? []).map((r: { account_id: string }) => r.account_id);
  }

  const toInsert = DEFAULTS.filter((d) => !byName.has(d.name));
  const toFixProp = DEFAULTS.filter(
    (d) => d.kind === "prop" && byName.has(d.name) && "prop" in d && !propIdsWithRow.includes(byName.get(d.name)!.id)
  );

  for (const def of toInsert) {
    const { data: inserted, error: insertAcc } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        name: def.name,
        kind: def.kind,
        is_active: "is_active" in def ? def.is_active : true,
      })
      .select("id")
      .maybeSingle();

    if (insertAcc) {
      console.warn("[bootstrap] Could not insert account:", def.name, insertAcc.message);
      continue;
    }

    if (def.kind === "prop" && "prop" in def && inserted?.id) {
      const { error: insertProp } = await supabase.from("prop_accounts").insert({
        user_id: userId,
        account_id: inserted.id,
        ...def.prop,
      });
      if (insertProp) {
        console.warn("[bootstrap] Could not insert prop_accounts for:", def.name, insertProp.message);
      }
    }
  }

  for (const def of toFixProp) {
    if (def.kind !== "prop" || !("prop" in def) || !def.prop) continue;
    const acc = byName.get(def.name);
    if (!acc?.id) continue;
    const { error: insertProp } = await supabase.from("prop_accounts").insert({
      user_id: userId,
      account_id: acc.id,
      ...def.prop,
    });
    if (insertProp) {
      console.warn("[bootstrap] Could not insert missing prop_accounts for:", def.name, insertProp.message);
    }
  }

  return { ok: true };
}
