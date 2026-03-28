// app/api/macro/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("week") || getWeekStart();

  const { data, error } = await getSupabase()
    .from("adaptive_alerts")
    .select("*")
    .filter("week_start", "eq", weekStart)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[macro/alerts]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch alerts data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
