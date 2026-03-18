import { NextResponse } from "next/server";

export const revalidate = 300;

type NewsApiArticle = {
  title: string;
  source?: { name?: string | null } | null;
  publishedAt?: string | null;
  url?: string | null;
  description?: string | null;
  content?: string | null;
};

type NewsApiResponse = {
  status?: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
};

type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

function classifyImpact(article: NewsApiArticle): ImpactLevel {
  const text = [
    article.title,
    article.description,
    article.content,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const highWords = [
    "fed",
    "rate",
    "trump",
    "war",
    "sanction",
    "crisis",
    "emergency",
    "inflation",
  ];
  const mediumWords = [
    "gdp",
    "jobs",
    "employment",
    "oil",
    "gold",
    "bank",
    "ecb",
    "fomc",
  ];

  if (highWords.some((w) => text.includes(w))) {
    return "HIGH";
  }
  if (mediumWords.some((w) => text.includes(w))) {
    return "MEDIUM";
  }
  return "LOW";
}

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { data: [], error: "Missing NEWS_API_KEY" },
      { status: 200 },
    );
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set(
    "q",
    '(forex OR "stock market" OR "federal reserve" OR "interest rate" OR "wall street" OR "S&P 500" OR nasdaq OR "crude oil" OR gold OR inflation OR "central bank" OR FOMC OR ECB OR treasury OR "bond yield") AND (market OR trading OR finance OR economy OR investor)',
  );
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("apiKey", apiKey);
  // Restrict to known financial news domains
  url.searchParams.set(
    "domains",
    "reuters.com,bloomberg.com,cnbc.com,wsj.com,ft.com,marketwatch.com,investing.com,forexlive.com,fxstreet.com,dailyfx.com,finance.yahoo.com,seekingalpha.com,thestreet.com,barrons.com",
  );

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate },
    });

    if (!res.ok) {
      return NextResponse.json(
        { data: [], error: `Upstream error: ${res.status}` },
        { status: 200 },
      );
    }

    const json = (await res.json()) as NewsApiResponse;
    const articles = json.articles ?? [];

    // Filter out non-financial articles that may have slipped through
    const EXCLUDE_KEYWORDS = [
      "oscar", "grammy", "nfl", "nba", "mlb", "nhl", "super bowl",
      "kardashian", "celebrity", "entertainment", "movie", "album",
      "concert", "gaming", "esports", "reality tv", "netflix series",
      "tiktok trend", "instagram", "youtube",
    ];

    const filtered = articles.filter((a) => {
      const text = [a.title, a.description].filter(Boolean).join(" ").toLowerCase();
      return !EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
    });

    const items = filtered.slice(0, 10).map((a) => {
      const impact = classifyImpact(a);
      return {
        title: a.title,
        source: a.source?.name ?? "Unknown",
        publishedAt: a.publishedAt ?? null,
        url: a.url ?? "#",
        impact,
      };
    });

    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.warn("[news] failed to fetch NewsAPI:", error);
    return NextResponse.json(
      { data: [], error: "Failed to fetch NewsAPI" },
      { status: 200 },
    );
  }
}

