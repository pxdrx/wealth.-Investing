// app/api/macro/headlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { translateHeadlines } from "@/lib/macro/translate";
import { filterRelevantHeadlines } from "@/lib/macro/headline-filter";
import { requireEnv } from "@/lib/env";
import { cached } from "@/lib/cache";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

/** Source priority: lower = higher priority (Trump > TE > Reuters > ForexLive) */
const SOURCE_PRIORITY: Record<string, number> = {
  truth_social: 1,
  trading_economics: 2,
  reuters: 3,
  forexlive: 4,
};

/**
 * Sort headlines by published_at DESC, with source priority as tiebreaker
 * when headlines are within 1 minute of each other.
 */
function sortByDateAndPriority<T extends { published_at: string | null; source: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    const timeDiff = tb - ta;
    // If within 1 minute, use source priority
    if (Math.abs(timeDiff) < 60_000) {
      return (SOURCE_PRIORITY[a.source] ?? 5) - (SOURCE_PRIORITY[b.source] ?? 5);
    }
    return timeDiff;
  });
}

/**
 * Live-fetch headlines from ALL sources as fallback when DB is empty.
 * This ensures users always see headlines even if the cron hasn't run.
 */
async function fetchLiveHeadlines(limit: number) {
  try {
    const [rssModule, tsModule, teModule] = await Promise.all([
      import("@/lib/macro/scrapers/rss-headlines"),
      import("@/lib/macro/scrapers/truth-social"),
      import("@/lib/macro/scrapers/trading-economics"),
    ]);

    const [flResult, rtResult, tsResult, teResult] = await Promise.allSettled([
      rssModule.fetchForexLiveHeadlines(),
      rssModule.fetchReutersHeadlines(),
      tsModule.fetchTruthSocialPosts(),
      teModule.fetchTradingEconomicsHeadlines(),
    ]);

    const fl = flResult.status === "fulfilled" ? (flResult.value ?? []) : [];
    const rt = rtResult.status === "fulfilled" ? (rtResult.value ?? []) : [];
    const ts = tsResult.status === "fulfilled" ? (tsResult.value ?? []) : [];
    const te = teResult.status === "fulfilled" ? (teResult.value ?? []) : [];

    // Merge and sort by date + source priority
    const merged = sortByDateAndPriority(
      [...ts, ...te, ...fl, ...rt].filter((h) => h.published_at)
    );
    const all = filterRelevantHeadlines(merged).slice(0, limit);

    // Translate headlines to PT-BR before returning
    const translated = await translateHeadlines(all);

    // Assign temporary IDs for the UI
    return translated.map((h, i) => ({ ...h, id: `live-${i}-${h.external_id}` }));
  } catch (err) {
    console.error("[macro/headlines] Live fallback error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);

  // Parse query params
  const limitParam = parseInt(searchParams.get("limit") || "30", 10);
  const limit = Math.min(Math.max(1, limitParam), 100);
  const source = searchParams.get("source") as "forexlive" | "reuters" | "truth_social" | "trading_economics" | null;
  const forceLive = searchParams.get("live") === "1";
  // Extend default window to 7 days to catch more cached headlines
  const since = searchParams.get("since") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // If ?live=1, require auth and fetch directly from RSS feeds
  if (forceLive) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const supabaseUser = createSupabaseClientForUser(token);
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    console.log("[macro/headlines] Force live fetch requested by user:", user.id);
    const liveData = await fetchLiveHeadlines(limit);

    return NextResponse.json({ ok: true, data: liveData, source: "live" });
  }

  const cacheHeaders = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

  const fetchFromDb = async () => {
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
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      return sortByDateAndPriority(data);
    }

    return [];
  };

  let data: Awaited<ReturnType<typeof fetchFromDb>>;
  try {
    data = await cached("macro:headlines", fetchFromDb, { ttl: 300 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/headlines] DB error:", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch headlines" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { headers: cacheHeaders });
}
