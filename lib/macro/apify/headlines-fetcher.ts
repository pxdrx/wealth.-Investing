// lib/macro/apify/headlines-fetcher.ts
import { callActor } from "./client";
import { APIFY_ACTORS, TruthSocialPost } from "./types";
import type { MacroHeadline } from "../types";

/**
 * Fetch Trump's Truth Social posts via Apify scraper.
 * Returns null on failure (never throws).
 */
export async function fetchTruthSocialPosts(): Promise<MacroHeadline[] | null> {
  try {
    console.log("[headlines-fetcher] Fetching Truth Social posts...");

    const result = await callActor<TruthSocialPost>(
      APIFY_ACTORS.TRUTH_SOCIAL,
      {
        username: "realDonaldTrump",
        maxPosts: 10,
        cleanContent: true,
      },
      60_000 // 60s timeout
    );

    if (!result || result.items.length === 0) {
      console.warn("[headlines-fetcher] Truth Social: no results");
      return null;
    }

    console.log(`[headlines-fetcher] Truth Social: got ${result.items.length} posts`);

    return result.items.map((post) => {
      const text = (post.content || "").trim();
      // Truncate very long posts for headline display
      const headline = text.length > 280 ? text.slice(0, 277) + "..." : text;

      return {
        id: "",
        source: "truth_social" as const,
        headline,
        summary: text.length > 280 ? text : null,
        author: "@realDonaldTrump",
        url: post.url || null,
        impact: "high" as const, // Presidential posts are always market-relevant
        published_at: post.created_at || null,
        fetched_at: new Date().toISOString(),
        external_id: post.id || null,
      };
    }).filter((h) => h.headline.length > 0);
  } catch (err) {
    console.error("[headlines-fetcher] Truth Social error:", err);
    return null;
  }
}

/** Simple string hash for generating external_id from URL */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
