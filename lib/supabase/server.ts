import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./env";

/**
 * Create a Supabase client for API routes using the user's JWT.
 * Pass the access_token from the client (e.g. session.access_token).
 * Throws SupabaseConfigError if env is missing or invalid.
 */
export function createSupabaseClientForUser(accessToken: string) {
  const { url, anonKey, poolerUrl } = getSupabaseConfig();
  return createClient(poolerUrl ?? url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
