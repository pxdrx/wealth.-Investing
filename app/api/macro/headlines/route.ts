// app/api/macro/headlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Parse query params
  const limitParam = parseInt(searchParams.get("limit") || "30", 10);
  const limit = Math.min(Math.max(1, limitParam), 100);
  const source = searchParams.get("source") as "forexlive" | "fxstreet" | "reuters" | "truth_social" | "trading_economics" | null;
  const since = searchParams.get("since") || new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const supabase = getSupabase();

  let query = supabase
    .from("macro_headlines")
    .select("*")
    .gte("fetched_at", since)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("fetched_at", { ascending: false })
    .limit(limit);

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[macro/headlines]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch headlines" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
