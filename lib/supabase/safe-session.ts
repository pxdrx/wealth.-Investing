import { supabase } from "@/lib/supabase/client";

const SESSION_TIMEOUT_MS = 3_000;

/**
 * getSession() with a 3s timeout to prevent infinite loading.
 * Returns null session on timeout instead of hanging forever.
 */
export async function safeGetSession() {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null }; error: null }>((resolve) =>
        setTimeout(() => {
          console.warn("[safeGetSession] Timeout after 3s — returning null session");
          resolve({ data: { session: null }, error: null });
        }, SESSION_TIMEOUT_MS)
      ),
    ]);
    return result;
  } catch {
    return { data: { session: null }, error: null };
  }
}
