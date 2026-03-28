// app/api/macro/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/macro/constants";
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

async function fetchAlertsData(weekStart: string) {
  const { data, error } = await getSupabase()
    .from("adaptive_alerts")
    .select("*")
    .filter("week_start", "eq", weekStart)
    .order("created_at", { ascending: false });

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

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("week") || getWeekStart();

  let data: Awaited<ReturnType<typeof fetchAlertsData>>;
  try {
    data = await cached(`macro:alerts`, () => fetchAlertsData(weekStart), { ttl: 300 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/alerts]", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch alerts data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
