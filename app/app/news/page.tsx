"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSafetyTimeout } from "@/hooks/useSafetyTimeout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Newspaper, ExternalLink, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NewsItem {
  title: string;
  source: string;
  publishedAt: string | null;
  url: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

type ImpactFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

const IMPACT_FILTERS: { value: ImpactFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Média" },
  { value: "LOW", label: "Baixa" },
];

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImpactFilter>("ALL");
  useSafetyTimeout(loading, setLoading, "news");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news");
      const json = (await res.json().catch(() => ({}))) as {
        data?: NewsItem[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `Erro ${res.status}`);
        setNews([]);
        return;
      }
      setNews(json.data ?? []);
      setError(null);
      setLastFetched(new Date());
    } catch (e) {
      console.warn("[news] fetch error", e);
      setError("Não foi possível carregar as notícias");
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 5 minutes (only when tab is visible)
  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNews();
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Filtered news
  const filteredNews = useMemo(() => {
    const items = news.slice(0, 20);
    if (filter === "ALL") return items;
    return items.filter((item) => item.impact === filter);
  }, [news, filter]);

  // Format items with timeAgo
  const formattedNews = useMemo(() => {
    return filteredNews.map((item) => {
      let timeLabel = "";
      if (item.publishedAt) {
        try {
          timeLabel = timeAgo(new Date(item.publishedAt));
        } catch {
          timeLabel = "";
        }
      }
      return { ...item, timeLabel };
    });
  }, [filteredNews]);

  // Last fetched label
  const lastFetchedLabel = useMemo(() => {
    if (!lastFetched) return null;
    return timeAgo(lastFetched);
  }, [lastFetched]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Newspaper className="h-7 w-7 text-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Noticias
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Feed de noticias do mercado
          </p>
        </div>
      </div>

      {/* Filter tabs + refresh indicator */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {IMPACT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {lastFetchedLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>Atualizado {lastFetchedLabel}</span>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={`skel-${i}`}
              className="rounded-[22px]"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <CardContent className="p-5 space-y-3">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                  <div className="ml-auto h-5 w-14 rounded-full bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card
          className="mt-6 rounded-[22px]"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && formattedNews.length === 0 && (
        <Card
          className="mt-6 rounded-[22px]"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma noticia disponivel
              {filter !== "ALL" ? ` com impacto ${filter.toLowerCase()}` : ""}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* News list */}
      {!loading && !error && formattedNews.length > 0 && (
        <Card
          className="mt-6 rounded-[22px] overflow-hidden"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardContent className="p-0">
            <ul>
              {formattedNews.map((item, i) => (
                <li key={`${item.title}-${i}`}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug group-hover:underline group-hover:underline-offset-2">
                        {item.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.source}</span>
                        {item.timeLabel && <span>- {item.timeLabel}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Badge
                        variant={
                          item.impact === "HIGH"
                            ? "destructive"
                            : item.impact === "MEDIUM"
                            ? "outline"
                            : "secondary"
                        }
                        className={cn(
                          "text-[10px] font-semibold",
                          item.impact === "HIGH"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100"
                            : item.impact === "MEDIUM"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.impact}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                  {i < formattedNews.length - 1 && <Separator />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Item count */}
      {!loading && !error && formattedNews.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Exibindo {formattedNews.length} noticia{formattedNews.length !== 1 ? "s" : ""}
          {filter !== "ALL" ? ` (filtro: ${filter.toLowerCase()})` : ""}
        </p>
      )}
    </div>
  );
}
