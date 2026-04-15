import { redis } from "./redis";

/**
 * Distributed lock for cron routes. Prevents duplicate execution when Vercel
 * double-invokes. Returns true if the caller acquired the lock (should proceed).
 *
 * Fail-open: if Redis is unavailable (no-op proxy returns null), we return true
 * so crons never silently stall. Vercel duplicate invocation is rare; unavailable
 * Redis is far worse than a rare double-run.
 */
export async function acquireCronLock(name: string, ttlSeconds = 300): Promise<boolean> {
  const key = `lock:cron:${name}`;
  try {
    const result = await redis.set(key, Date.now(), { nx: true, ex: ttlSeconds });
    if (result === null) {
      // Redis no-op proxy OR key already held — must distinguish.
      // The no-op proxy returns null for every call; real Upstash returns null on NX fail, "OK" on success.
      // If UPSTASH_REDIS_REST_URL is unset, treat as fail-open.
      if (!process.env.UPSTASH_REDIS_REST_URL) return true;
      return false;
    }
    return result === "OK";
  } catch (err) {
    console.warn(`[cron-lock] ${name} acquisition error — failing open:`, err);
    return true;
  }
}
