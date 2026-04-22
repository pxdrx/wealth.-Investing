// app/api/macro/headlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { translateHeadlines } from "@/lib/macro/translate";
import { filterRelevantHeadlines } from "@/lib/macro/headline-filter";
import { requireEnv } from "@/lib/env";
import { cached } from "@/lib/cache";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Whitelist of high-impact macro keywords used to filter breaking headlines.
 * Case-insensitive match against title.
 */
const BREAKING_KEYWORDS = [
  "fed", "fomc", "cpi", "ppi", "nfp", "nonfarm", "rate", "ecb", "boj",
  "war", "crisis", "brics", "tariff", "sanction", "powell", "lagarde",
  "recession", "inflation", "gdp", "unemployment",
  "trump", "biden", "putin", "xi",
];

/**
 * Normalise a title for deduplication: lowercase, strip accents/punctuation,
 * collapse whitespace. Two headlines whose normalised forms share >= 60% of
 * their words are considered duplicates.
 */
function normaliseTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOverlap(a: string, b: string): number {
  const wordsA = normaliseTitle(a).split(" ").filter(Boolean);
  const wb = new Set(normaliseTitle(b).split(" ").filter(Boolean));
  if (wordsA.length === 0 || wb.size === 0) return 0;
  const common = wordsA.filter((w) => wb.has(w)).length;
  return common / Math.min(wordsA.length, wb.size);
}

/**
 * Deduplicate headlines: keep the most recent representative of each "cluster"
 * of semantically similar headlines (>= 60% word overlap).
 */
function deduplicateBreaking<T extends { title?: string | null; published_at?: string | null }>(items: T[]): T[] {
  const kept: T[] = [];
  for (const item of items) {
    const title = item.title ?? "";
    const isDup = kept.some((k) => titleOverlap(k.title ?? "", title) >= 0.6);
    if (!isDup) kept.push(item);
  }
  return kept;
}

const BREAKING_SOURCES = new Set<string>(["te_breaking", "financial_juice"]);

/**
 * Deterministic 16-hex-char key from url + title for dismissal persistence.
 * Stable across DB rows as long as url/title don't change.
 */
function buildNewsKey(url: string | null | undefined, title: string | null | undefined): string {
  const payload = `${url ?? ""}::${title ?? ""}`;
  return createHash("sha1").update(payload).digest("hex").slice(0, 16);
}

function matchesBreakingKeyword(title: string | null | undefined): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return BREAKING_KEYWORDS.some((kw) => lower.includes(kw));
}

function isBreakingItem(item: { source?: string | null; impact?: string | null; title?: string | null }): boolean {
  const source = item.source ?? "";
  const impact = item.impact ?? "";
  if (BREAKING_SOURCES.has(source)) return true;
  if (impact === "breaking") return true;
  return matchesBreakingKeyword(item.title);
}

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
  const breakingMode = searchParams.get("breaking") === "true" || searchParams.get("breaking") === "1";
  const limitParam = parseInt(searchParams.get("limit") || (breakingMode ? "3" : "30"), 10);
  // Breaking mode caps at 5 to stay focused; default 3.
  const userLimit = breakingMode
    ? Math.min(Math.max(1, limitParam), 5)
    : Math.min(Math.max(1, limitParam), 100);
  // DB fetch limit: for breaking mode fetch more rows so dedup + filter still
  // yields enough results. For normal mode, use the user limit directly.
  const limit = breakingMode ? 50 : userLimit;
  const source = searchParams.get("source") as "forexlive" | "reuters" | "truth_social" | "trading_economics" | null;
  const forceLive = searchParams.get("live") === "1";
  // Extend default window to 7 days to catch more cached headlines
  const since = searchParams.get("since") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Optional auth for dismissals filtering. Does NOT gate the endpoint.
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  let dismissedKeys: Set<string> = new Set();
  if (authToken) {
    try {
      const supabaseUser = createSupabaseClientForUser(authToken);
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) {
        const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const { data: dismissals } = await supabaseUser
          .from("macro_news_dismissals")
          .select("news_key")
          .gt("dismissed_at", cutoff);
        if (dismissals) {
          dismissedKeys = new Set(
            (dismissals as Array<{ news_key: string }>).map((d) => d.news_key),
          );
        }
      }
    } catch {
      // Silent: dismissal filtering is opportunistic.
    }
  }

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

    const liveData = await fetchLiveHeadlines(limit);
    const enriched = liveData
      .map((h) => ({ ...h, news_key: buildNewsKey((h as { url?: string | null }).url, (h as { title?: string | null }).title) }))
      .filter((h) => !dismissedKeys.has(h.news_key));
    const filtered = breakingMode
      ? deduplicateBreaking(enriched.filter(isBreakingItem)).slice(0, userLimit)
      : enriched;

    return NextResponse.json({ ok: true, data: filtered, source: "live" });
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

  const withKeys = (data ?? []).map((h) => {
    const row = h as { url?: string | null; title?: string | null };
    return { ...h, news_key: buildNewsKey(row.url, row.title) };
  });
  const notDismissed = withKeys.filter((h) => !dismissedKeys.has(h.news_key));
  const finalData = breakingMode
    ? deduplicateBreaking(notDismissed.filter(isBreakingItem)).slice(0, userLimit)
    : notDismissed;

  return NextResponse.json({ ok: true, data: finalData }, { headers: cacheHeaders });
}
