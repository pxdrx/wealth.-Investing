"use client";

import { useCallback, useEffect, useState } from "react";
import { Siren, X, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface BreakingItem {
  id?: string;
  news_key: string;
  title: string | null;
  url: string | null;
  source: string | null;
  published_at: string | null;
  impact: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; items: BreakingItem[] }
  | { kind: "empty" }
  | { kind: "error" };

function relativeTime(ts: string | null): string {
  if (!ts) return "";
  const diff = Math.max(0, Date.now() - new Date(ts).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function BreakingNewsFeed({ limit = 3 }: { limit?: number }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      const res = await fetch(`/api/macro/headlines?breaking=true&limit=${limit}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const body = await res.json();
      if (!body.ok || !Array.isArray(body.data)) {
        setState({ kind: "error" });
        return;
      }
      const items = body.data as BreakingItem[];
      if (items.length === 0) {
        setState({ kind: "empty" });
        return;
      }
      setState({ kind: "ready", items });
    } catch {
      setState({ kind: "error" });
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = useCallback(
    async (newsKey: string) => {
      if (state.kind !== "ready") return;
      const prev = state.items;
      // Optimistic: remove immediately.
      const next = prev.filter((i) => i.news_key !== newsKey);
      setState(next.length === 0 ? { kind: "empty" } : { kind: "ready", items: next });
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setState({ kind: "ready", items: prev });
          setErrorMsg("Faça login para dispensar notícias permanentemente.");
          return;
        }
        const res = await fetch("/api/macro/news/dismissals", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ news_key: newsKey }),
        });
        if (!res.ok) {
          // Rollback.
          setState({ kind: "ready", items: prev });
          setErrorMsg("Não foi possível dispensar a notícia. Tente novamente.");
        }
      } catch {
        setState({ kind: "ready", items: prev });
        setErrorMsg("Erro de conexão ao dispensar notícia.");
      }
    },
    [state],
  );

  if (state.kind === "loading") {
    return (
      <div className="rounded-[22px] border border-red-500/20 bg-red-500/5 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (state.kind === "error" || state.kind === "empty") {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Siren className="h-4 w-4 text-red-500" />
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Breaking — Alto Impacto
        </h3>
      </div>
      {errorMsg && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          {errorMsg}
        </p>
      )}
      <ul className="grid gap-2">
        {state.items.map((item) => (
          <li
            key={item.news_key}
            className="group relative flex items-start gap-3 rounded-[18px] border border-red-500/30 bg-red-500/5 px-4 py-3"
          >
            <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                  {item.source ?? "breaking"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(item.published_at)}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {item.title}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ) : (
                  item.title
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(item.news_key)}
              aria-label="Dispensar"
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
