// app/api/macro/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { cached } from "@/lib/cache";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

async function fetchHistoryData() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("weekly_panoramas")
    .select("week_start, week_end, is_frozen, created_at")
    .order("week_start", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  let data: Awaited<ReturnType<typeof fetchHistoryData>>;
  try {
    data = await cached("macro:history", fetchHistoryData, { ttl: 600 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/history]", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch history data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
