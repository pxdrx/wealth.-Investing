"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useEntitlements } from "@/hooks/use-entitlements";

export type DebriefMood = "default" | "thinking" | "alert" | "celebrating";

interface DebriefResponse {
  ok: true;
  insight: string;
  pattern: string;
  mood: DebriefMood;
  cacheHit: boolean;
  fallback?: boolean;
  generatedAt: string;
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: DebriefResponse }
  | { kind: "error" };

function moodTone(mood: DebriefMood): { bg: string; dot: string; label: string } {
  switch (mood) {
    case "alert":
      return {
        bg: "bg-rose-500/10 border-rose-500/20",
        dot: "bg-rose-500",
        label: "text-rose-600 dark:text-rose-300",
      };
    case "celebrating":
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20",
        dot: "bg-emerald-500",
        label: "text-emerald-600 dark:text-emerald-300",
      };
    case "thinking":
      return {
        bg: "bg-sky-500/10 border-sky-500/20",
        dot: "bg-sky-500",
        label: "text-sky-600 dark:text-sky-300",
      };
    default:
      return {
        bg: "bg-emerald-500/5 border-emerald-500/15",
        dot: "bg-emerald-500",
        label: "text-emerald-600 dark:text-emerald-300",
      };
  }
}

interface Props {
  tradeId: string;
}

export function DexterTradeDebrief({ tradeId }: Props) {
  const { hasAccess } = useEntitlements();
  const allowed = hasAccess("dexterTradeDebrief");

  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!allowed) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState((prev) => (prev.kind === "idle" ? { kind: "loading" } : prev));
          obs.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [allowed]);

  useEffect(() => {
    if (state.kind !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          setState({ kind: "error" });
          return;
        }
        const res = await fetch(`/api/dexter/trade-debrief/${tradeId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const json = (await res.json()) as DebriefResponse | { ok: false };
        if (cancelled) return;
        if ("ok" in json && json.ok === false) {
          setState({ kind: "error" });
          return;
        }
        setState({ kind: "success", data: json as DebriefResponse });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.kind, tradeId]);

  if (!allowed) {
    return (
      <div
        ref={containerRef}
        className="rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
            D
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              Dexter · debrief
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Desbloqueie o debrief deste trade com o plano Pro.
            </p>
            <Link
              href="/app/subscription"
              className="mt-2 inline-flex items-center rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <div
        ref={containerRef}
        className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/15 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-muted-foreground/20 animate-pulse" />
            <div className="h-4 w-11/12 rounded bg-muted-foreground/15 animate-pulse" />
            <div className="h-4 w-3/5 rounded bg-muted-foreground/10 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        ref={containerRef}
        className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3"
      >
        <p className="text-xs text-muted-foreground">
          Dexter não conseguiu gerar o debrief agora. Tente recarregar em alguns minutos.
        </p>
      </div>
    );
  }

  const { data } = state;
  const tone = moodTone(data.mood);
  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border px-4 py-3 ${tone.bg}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
          D
          <span
            aria-hidden
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${tone.dot}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.label}`}>
            Dexter · debrief
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{data.insight}</p>
          {data.pattern && data.pattern.length > 0 && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              <span aria-hidden>💭</span> {data.pattern}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
