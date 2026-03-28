import { Redis } from "@upstash/redis";

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[redis] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN — " +
      "cache will be disabled (all operations will no-op)"
    );
    // Return a proxy that silently no-ops every method call
    return new Proxy({} as Redis, {
      get(_target, prop) {
        if (typeof prop === "string") {
          return () => Promise.resolve(null);
        }
        return undefined;
      },
    });
  }

  return new Redis({ url, token });
}

export const redis = createRedisClient();
