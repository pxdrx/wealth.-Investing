import { supabase } from "@/lib/supabase/client";

const DEFAULTS = [
  { name: "Pessoal", kind: "personal" as const, is_active: true },
  { name: "Crypto Fund Trader", kind: "crypto" as const, is_active: true },
];

export const DEFAULT_ACCOUNTS = DEFAULTS;

/**
 * Garante as 2 contas padrão (Pessoal + Crypto Fund Trader).
 * Idempotente: não duplica.
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

  const toInsert = DEFAULTS.filter((d) => !byName.has(d.name));

  for (const def of toInsert) {
    const { error: insertAcc } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        name: def.name,
        kind: def.kind,
        is_active: "is_active" in def ? def.is_active : true,
      });

    if (insertAcc) {
      console.warn("[bootstrap] Could not insert account:", def.name, insertAcc.message);
      continue;
    }

  }

  return { ok: true };
}
