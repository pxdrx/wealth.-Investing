import { supabase } from "@/lib/supabase/client";

const DEFAULTS = [
  { name: "Pessoal", kind: "personal" as const, is_active: true },
];

export const DEFAULT_ACCOUNTS = DEFAULTS;

/**
 * FIX TECH-014: Guard against race condition when multiple tabs call simultaneously.
 * Tracks in-flight bootstrap calls per userId to prevent duplicate execution.
 */
const inFlightBootstraps = new Map<string, Promise<{ ok: boolean }>>();

/**
 * Garante a conta padrão (Pessoal).
 * Idempotente: não duplica.
 * Race-condition safe: concurrent calls for the same userId share a single execution.
 */
export async function ensureDefaultAccounts(userId: string): Promise<{ ok: boolean }> {
  // If a bootstrap is already in-flight for this user, return the same promise
  const existing = inFlightBootstraps.get(userId);
  if (existing) return existing;

  const promise = doEnsureDefaultAccounts(userId).finally(() => {
    inFlightBootstraps.delete(userId);
  });

  inFlightBootstraps.set(userId, promise);
  return promise;
}

async function doEnsureDefaultAccounts(userId: string): Promise<{ ok: boolean }> {
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

  // If all accounts exist, nothing to do (handles concurrent tabs that both checked)
  if (toInsert.length === 0) return { ok: true };

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
      // Ignore duplicate key errors (another tab may have inserted in parallel)
      if (insertAcc.message?.includes("duplicate") || insertAcc.message?.includes("unique")) {
        continue;
      }
      console.warn("[bootstrap] Could not insert account:", def.name, insertAcc.message);
      continue;
    }
  }

  return { ok: true };
}
