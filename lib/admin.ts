import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check whether a user has the is_admin flag set in their profile.
 * Returns false on any error or missing profile — never throws.
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.is_admin === true;
}
