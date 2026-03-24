import type { MacroHeadline } from "../types";
import { fetchWithTimeout, stripHtml } from "./utils";

const TRUMP_ACCOUNT_ID = "107780257626128497";
const API_BASE = "https://truthsocial.com/api/v1";

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  url: string;
  reblog: MastodonStatus | null;
}

/**
 * Fetch Trump's Truth Social posts via public Mastodon API.
 * Returns null on failure (never throws).
 */
export async function fetchTruthSocialPosts(): Promise<MacroHeadline[] | null> {
  try {
    console.log("[truth-social] Fetching posts...");

    const res = await fetchWithTimeout(
      `${API_BASE}/accounts/${TRUMP_ACCOUNT_ID}/statuses?limit=20&exclude_replies=true&exclude_reblogs=true`,
      30_000,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      console.warn(`[truth-social] API returned ${res.status}`);
      return null;
    }

    const posts: MastodonStatus[] = await res.json();
    if (!posts || posts.length === 0) {
      console.warn("[truth-social] No posts returned");
      return null;
    }

    console.log(`[truth-social] Got ${posts.length} posts`);

    return posts
      .filter((p) => p.content && !p.reblog)
      .map((post) => {
        const text = stripHtml(post.content).trim();
        const headline = text.length > 280 ? text.slice(0, 277) + "..." : text;

        return {
          id: "",
          source: "truth_social" as const,
          headline,
          summary: text.length > 280 ? text : null,
          author: "@realDonaldTrump",
          url: post.url || `https://truthsocial.com/@realDonaldTrump/posts/${post.id}`,
          impact: "high" as const,
          published_at: post.created_at || null,
          fetched_at: new Date().toISOString(),
          external_id: post.id,
        };
      })
      .filter((h) => h.headline.length > 0);
  } catch (err) {
    console.error("[truth-social] Error:", err);
    return null;
  }
}
