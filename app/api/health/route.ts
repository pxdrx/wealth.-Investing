import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { redis } from "@/lib/redis";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

async function checkRedis(): Promise<"ok" | "fail" | "disabled"> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return "disabled";
  try {
    const pong = await redis.ping();
    return pong === "PONG" ? "ok" : "fail";
  } catch {
    return "fail";
  }
}

async function checkDb(): Promise<"ok" | "fail"> {
  try {
    const { url, anonKey, poolerUrl } = getSupabaseConfig();
    const sb = createClient(poolerUrl ?? url, anonKey);
    const { error } = await sb.from("profiles").select("user_id").limit(1);
    return error ? "fail" : "ok";
  } catch {
    return "fail";
  }
}

export async function GET() {
  const [redisStatus, dbStatus] = await Promise.all([checkRedis(), checkDb()]);

  const healthy = dbStatus === "ok" && redisStatus !== "fail";

  return NextResponse.json(
    {
      ok: healthy,
      redis: redisStatus,
      db: dbStatus,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
