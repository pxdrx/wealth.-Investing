"use client";

import { useEffect, useMemo, useState } from "react";

type NewsItem = {
  title: string;
  source: string;
  publishedAt: string | null;
  url: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
};

export type { NewsItem };

interface NewsData {
  news: NewsItem[] | null;
  newsLoading: boolean;
  newsError: string | null;
  formattedNews: (NewsItem & { timeLabel: string })[];
}

export function useNewsData(): NewsData {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      setNewsLoading(true);
      try {
        const res = await fetch("/api/news");
        const json = (await res.json().catch(() => ({}))) as {
          data?: NewsItem[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setNewsError(json.error ?? `Erro ${res.status}`);
          setNews([]);
          return;
        }
        setNews(json.data ?? []);
        setNewsError(null);
      } catch (e) {
        if (!cancelled) {
          console.warn("[dashboard] news fetch error", e);
          setNewsError("Não foi possível carregar as notícias");
          setNews([]);
        }
      } finally {
        if (!cancelled) {
          setNewsLoading(false);
        }
      }
    }

    fetchNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const formattedNews = useMemo(() => {
    if (!news) return [];
    return news.slice(0, 6).map((item) => {
      let timeLabel = "";
      if (item.publishedAt) {
        const d = new Date(item.publishedAt);
        if (!Number.isNaN(d.getTime())) {
          timeLabel = d.toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }
      return { ...item, timeLabel };
    });
  }, [news]);

  return {
    news,
    newsLoading,
    newsError,
    formattedNews,
  };
}
