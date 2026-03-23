// lib/macro/apify/week-ahead-fetcher.ts
// Fetches the latest TradingEconomics "Week Ahead" editorial via Apify RAG Web Browser

import { callActor } from "./client";
import { APIFY_ACTORS } from "./types";

interface RagBrowserResult {
  text?: string;
  markdown?: string;
  crawl?: { httpStatusCode?: number };
  metadata?: { title?: string; url?: string };
}

interface WeekAheadResult {
  editorial: string;
  articleUrl: string;
  publishedDate: string;
}

const LOG_PREFIX = "[week-ahead-fetcher]";

/**
 * Extract the most recent "Week Ahead" article URL from a markdown news listing.
 * Looks for patterns like: [Week Ahead - Dec 22nd](/calendar?article=XXXXX&...)
 */
function findLatestWeekAheadUrl(markdown: string): { url: string; publishedDate: string } | null {
  // Match news listing entries: **[Week Ahead - {date}](/calendar?article=XXXXX...)**
  // followed by summary text and "Published on YYYY-MM-DD"
  const entryPattern = /\[Week Ahead\s*[-–—]\s*([^\]]+)\]\(\/calendar\?article=(\d+)[^)]*\)[\s\S]*?Published on (\d{4}-\d{2}-\d{2})/gi;

  const matches: { url: string; publishedDate: string; dateObj: Date }[] = [];

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(markdown)) !== null) {
    const articleId = match[2];
    const publishedDate = match[3];
    const dateObj = new Date(publishedDate);
    if (!isNaN(dateObj.getTime())) {
      matches.push({
        url: `https://tradingeconomics.com/calendar?article=${articleId}`,
        publishedDate,
        dateObj,
      });
    }
  }

  if (matches.length === 0) {
    // Fallback: try simpler pattern for article links
    const simplePattern = /\[Week Ahead[^\]]*\]\((\/calendar\?article=(\d+)[^)]*)\)/gi;
    let simpleMatch: RegExpExecArray | null;
    while ((simpleMatch = simplePattern.exec(markdown)) !== null) {
      const articleId = simpleMatch[2];
      matches.push({
        url: `https://tradingeconomics.com/calendar?article=${articleId}`,
        publishedDate: new Date().toISOString().slice(0, 10),
        dateObj: new Date(),
      });
    }
  }

  if (matches.length === 0) return null;

  // Sort by date descending, return most recent
  matches.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  return { url: matches[0].url, publishedDate: matches[0].publishedDate };
}

/**
 * Extract the editorial content from a Week Ahead article markdown.
 * Content is between the "Week Ahead" header and the market data tables.
 */
function parseEditorialContent(markdown: string): string | null {
  if (!markdown) return null;

  // Try to find content after "Week Ahead" header
  const headerPatterns = [
    /#{1,3}\s*Week Ahead[^\n]*\n/i,
    /\*\*Week Ahead[^\n]*\*\*\n/i,
    /Week Ahead\s*[-–—]\s*[A-Z][a-z]+ \d+/i,
  ];

  let startIdx = -1;
  for (const pattern of headerPatterns) {
    const match = pattern.exec(markdown);
    if (match) {
      startIdx = match.index + match[0].length;
      break;
    }
  }

  // If no header found, use the start of the markdown (the article itself may be the content)
  if (startIdx === -1) {
    startIdx = 0;
  }

  let content = markdown.slice(startIdx);

  // Cut off at market data tables (start with "| Actual | Chg |" or similar table patterns)
  const tablePatterns = [
    /\|\s*Actual\s*\|\s*Chg\s*\|/i,
    /\|\s*Last\s*\|\s*Previous\s*\|/i,
    /\n\|[-\s|]+\|\n/,  // markdown table separator
    /#{1,3}\s*(Calendar|Markets|Indicators|Related)/i,
    /\*\*NEWS\*\*/i,
    /\n---\n/,
  ];

  for (const pattern of tablePatterns) {
    const match = pattern.exec(content);
    if (match) {
      content = content.slice(0, match.index);
    }
  }

  // Clean up
  content = content
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Must have meaningful content (at least 200 chars)
  if (content.length < 200) return null;

  return content;
}

/**
 * Check if a date string is within the last N days.
 */
function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Fetch the latest TradingEconomics "Week Ahead" editorial via Apify RAG Web Browser.
 *
 * Two-step process:
 * 1. Search for recent Week Ahead articles to find the latest URL
 * 2. Fetch the full article content
 *
 * Returns null on any failure (never throws).
 */
export async function fetchWeekAheadViaApify(): Promise<WeekAheadResult | null> {
  try {
    // Step 1: Find the latest Week Ahead article
    console.log(`${LOG_PREFIX} Step 1: Searching for latest Week Ahead article...`);

    const searchResult = await callActor<RagBrowserResult>(
      APIFY_ACTORS.RAG_WEB_BROWSER,
      {
        query: "tradingeconomics.com week ahead latest",
        maxResults: 3,
      },
      60_000
    );

    if (!searchResult || searchResult.items.length === 0) {
      console.warn(`${LOG_PREFIX} Step 1 failed: no search results`);
      return null;
    }

    // Scan all results for Week Ahead article links
    let articleInfo: { url: string; publishedDate: string } | null = null;

    for (const item of searchResult.items) {
      const markdown = item.markdown || item.text || "";
      const found = findLatestWeekAheadUrl(markdown);
      if (found) {
        articleInfo = found;
        break;
      }
    }

    if (!articleInfo) {
      // Fallback: check if any result IS a Week Ahead article already
      for (const item of searchResult.items) {
        const markdown = item.markdown || item.text || "";
        const title = item.metadata?.title || "";
        if (/week ahead/i.test(title) || /week ahead/i.test(markdown.slice(0, 200))) {
          const editorial = parseEditorialContent(markdown);
          if (editorial) {
            const url = item.metadata?.url || "https://tradingeconomics.com";
            console.log(`${LOG_PREFIX} Found Week Ahead directly in search results (${editorial.length} chars)`);
            return {
              editorial,
              articleUrl: url,
              publishedDate: new Date().toISOString().slice(0, 10),
            };
          }
        }
      }

      console.warn(`${LOG_PREFIX} No Week Ahead article links found in search results`);
      return null;
    }

    console.log(`${LOG_PREFIX} Found article: ${articleInfo.url} (published ${articleInfo.publishedDate})`);

    // Validate freshness (within 10 days)
    if (!isWithinDays(articleInfo.publishedDate, 10)) {
      console.warn(`${LOG_PREFIX} Article too old: ${articleInfo.publishedDate}`);
      return null;
    }

    // Step 2: Fetch the full article content
    console.log(`${LOG_PREFIX} Step 2: Fetching full article...`);

    const articleResult = await callActor<RagBrowserResult>(
      APIFY_ACTORS.RAG_WEB_BROWSER,
      {
        query: articleInfo.url,
        maxResults: 1,
      },
      60_000
    );

    if (!articleResult || articleResult.items.length === 0) {
      console.warn(`${LOG_PREFIX} Step 2 failed: could not fetch article`);
      return null;
    }

    const articleMarkdown = articleResult.items[0].markdown || articleResult.items[0].text || "";
    const editorial = parseEditorialContent(articleMarkdown);

    if (!editorial) {
      console.warn(`${LOG_PREFIX} Could not parse editorial from article markdown (${articleMarkdown.length} chars total)`);
      return null;
    }

    console.log(`${LOG_PREFIX} Success: ${editorial.length} chars editorial from ${articleInfo.publishedDate}`);

    return {
      editorial,
      articleUrl: articleInfo.url,
      publishedDate: articleInfo.publishedDate,
    };
  } catch (err) {
    console.error(`${LOG_PREFIX} Unexpected error:`, err);
    return null;
  }
}
