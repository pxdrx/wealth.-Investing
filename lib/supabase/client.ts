import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./env";

export { SupabaseConfigError } from "./env";

/** No-op lock that bypasses navigator.locks (Web Locks API).
 *  Prevents deadlocks when multiple components call getSession() concurrently.
 *  Safe for single-user SPA — token refresh races are harmless. */
async function noopLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  return await fn();
}

const { url, anonKey } = getSupabaseConfig();
export const supabase = createClient(url, anonKey, {
  auth: {
    lock: noopLock,
  },
});
