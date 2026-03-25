// app/api/macro/headlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Live-fetch headlines directly from RSS feeds as fallback when DB is empty.
 * This ensures users always see headlines even if the cron hasn't run.
 */
async function fetchLiveHeadlines(limit: number) {
  try {
    const {
      fetchForexLiveHeadlines,
      fetchFXStreetHeadlines,
      fetchReutersHeadlines,
    } = await import("@/lib/macro/scrapers/rss-headlines");

    const [flResult, fxResult, rtResult] = await Promise.allSettled([
      fetchForexLiveHeadlines(),
      fetchFXStreetHeadlines(),
      fetchReutersHeadlines(),
    ]);

    const fl = flResult.status === "fulfilled" ? (flResult.value ?? []) : [];
    const fx = fxResult.status === "fulfilled" ? (fxResult.value ?? []) : [];
    const rt = rtResult.status === "fulfilled" ? (rtResult.value ?? []) : [];

    // Merge and sort by published_at descending
    const all = [...fl, ...fx, ...rt]
      .filter((h) => h.published_at)
      .sort((a, b) => {
        const ta = new Date(a.published_at!).getTime();
        const tb = new Date(b.published_at!).getTime();
        return tb - ta;
      })
      .slice(0, limit);

    // Assign temporary IDs for the UI
    return all.map((h, i) => ({ ...h, id: `live-${i}-${h.external_id}` }));
  } catch (err) {
    console.error("[macro/headlines] Live fallback error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Parse query params
  const limitParam = parseInt(searchParams.get("limit") || "30", 10);
  const limit = Math.min(Math.max(1, limitParam), 100);
  const source = searchParams.get("source") as "forexlive" | "fxstreet" | "reuters" | "truth_social" | "trading_economics" | null;
  const forceLive = searchParams.get("live") === "1";
  // Extend default window to 7 days to catch more cached headlines
  const since = searchParams.get("since") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // If ?live=1, skip DB and fetch directly from RSS feeds
  if (forceLive) {
    console.log("[macro/headlines] Force live fetch requested");
    const liveData = await fetchLiveHeadlines(limit);
    return NextResponse.json({ ok: true, data: liveData, source: "live" });
  }

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
    console.error("[macro/headlines] DB error:", error.message);
    // Fall back to live fetch on DB error
    const liveData = await fetchLiveHeadlines(limit);
    return NextResponse.json({ ok: true, data: liveData, source: "live" });
  }

  // If DB returned results, use them
  if (data && data.length > 0) {
    return NextResponse.json({ ok: true, data });
  }

  // DB is empty — fetch live from RSS feeds as fallback
  console.log("[macro/headlines] DB empty, fetching live from RSS feeds");
  const liveData = await fetchLiveHeadlines(limit);
  return NextResponse.json({ ok: true, data: liveData, source: "live" });
}
