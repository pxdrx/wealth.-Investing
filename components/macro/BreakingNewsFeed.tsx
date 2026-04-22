"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Siren, X, ExternalLink, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAppT } from "@/hooks/useAppLocale";
import { cn } from "@/lib/utils";

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

const DISMISSED_LOCAL_KEY = "breaking-dismissed";

/** Read locally-dismissed keys from localStorage (fallback for logged-out users). */
function getLocalDismissals(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_LOCAL_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistLocalDismissal(key: string) {
  try {
    const existing = getLocalDismissals();
    existing.add(key);
    // Keep max 200 entries to avoid bloating localStorage.
    const arr = Array.from(existing).slice(-200);
    localStorage.setItem(DISMISSED_LOCAL_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

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

/** Max items visible at once. */
const MAX_VISIBLE = 3;

export function BreakingNewsFeed({ limit = 5 }: { limit?: number }) {
  const t = useAppT();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    // Only show loading skeleton on first load.
    if (!loadedOnce.current) setState({ kind: "loading" });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      const res = await fetch(`/api/macro/headlines?breaking=true&limit=${limit}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        setState((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
        return;
      }
      const body = await res.json();
      if (!body.ok || !Array.isArray(body.data)) {
        setState((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
        return;
      }
      let items = body.data as BreakingItem[];
      // Also filter by local dismissals (covers logged-out state + race conditions).
      const localDismissed = getLocalDismissals();
      items = items.filter((i) => !localDismissed.has(i.news_key));
      if (items.length === 0) {
        setState({ kind: "empty" });
        return;
      }
      setState({ kind: "ready", items });
      loadedOnce.current = true;
    } catch {
      setState((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = useCallback(
    async (newsKey: string) => {
      if (state.kind !== "ready") return;
      const prev = state.items;
      // Optimistic: remove immediately with animation.
      setDismissing((s) => new Set(s).add(newsKey));
      // Persist locally immediately for instant subsequent filter.
      persistLocalDismissal(newsKey);

      // Wait for CSS exit animation (300ms).
      setTimeout(() => {
        setDismissing((s) => {
          const next = new Set(s);
          next.delete(newsKey);
          return next;
        });
        const next = prev.filter((i) => i.news_key !== newsKey);
        setState(next.length === 0 ? { kind: "empty" } : { kind: "ready", items: next });
      }, 300);

      // Persist to DB in background.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return; // Local dismissal already persisted.
        const res = await fetch("/api/macro/news/dismissals", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ news_key: newsKey }),
        });
        if (!res.ok) {
          setErrorMsg(t("macro.breaking.dismissFailed"));
        }
      } catch {
        // Local dismissal is already saved — no rollback needed.
      }
    },
    [state, t],
  );

  const handleDismissAll = useCallback(() => {
    if (state.kind !== "ready") return;
    for (const item of state.items) {
      persistLocalDismissal(item.news_key);
      // Fire DB dismissals in background.
      handleDismiss(item.news_key);
    }
  }, [state, handleDismiss]);

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

  const visibleItems = state.items.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, state.items.length - MAX_VISIBLE);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-red-500 animate-pulse" />
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("macro.breaking.title")}
          </h3>
          {state.items.length > 1 && (
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {state.items.length}
            </span>
          )}
        </div>
        {state.items.length > 1 && (
          <button
            type="button"
            onClick={handleDismissAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium px-2 py-1 rounded-lg hover:bg-muted/50"
          >
            Dispensar tudo
          </button>
        )}
      </div>
      {errorMsg && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          {errorMsg}
        </p>
      )}
      <ul className="grid gap-2">
        {visibleItems.map((item) => (
          <li
            key={item.news_key}
            className={cn(
              "group relative flex items-start gap-3 rounded-[18px] border border-red-500/30 bg-red-500/5 px-4 py-3 transition-all duration-300",
              dismissing.has(item.news_key) && "opacity-0 -translate-x-4 scale-95 pointer-events-none",
            )}
          >
            <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
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
              aria-label={t("macro.breaking.dismiss")}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="text-center text-[10px] text-muted-foreground/50 py-1">
          +{hiddenCount} mais
        </p>
      )}
    </section>
  );
}
