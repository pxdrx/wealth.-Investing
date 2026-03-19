import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validates that the given account belongs to the authenticated user.
 * Returns the account row if owned, null otherwise.
 */
export async function validateAccountOwnership(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
): Promise<{ id: string; name: string; kind: string } | null> {
  const { data } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
