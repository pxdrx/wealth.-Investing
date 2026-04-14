import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns true only if the user has plan="mentor" in subscriptions.
 * Caller should pass a service_role client (bypasses RLS).
 */
export async function isMentorPlan(
  svc: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await svc
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.plan === "mentor";
}
