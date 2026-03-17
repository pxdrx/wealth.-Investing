import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./env";

/**
 * Create a Supabase client with service_role key.
 * SERVER-ONLY — never import from "use client" modules.
 * Used for cross-user aggregate queries (e.g., community intelligence).
 */
export function createServiceRoleClient() {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
