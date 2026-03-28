import { redis } from "./redis";

interface CacheOptions {
  /** TTL in seconds */
  ttl: number;
}

/**
 * Get cached data or fetch fresh data and cache it.
 * Returns cached data if available, otherwise calls fetcher and caches result.
 * Redis failure is non-critical — always falls through to fetcher.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
  } catch {
    // Redis failure should not break the app — fall through to fetcher
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, JSON.stringify(fresh), { ex: options.ttl });
  } catch {
    // Cache write failure is non-critical
  }

  return fresh;
}

/**
 * Invalidate a cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Non-critical
  }
}

/**
 * Invalidate all keys matching a pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-critical
  }
}
