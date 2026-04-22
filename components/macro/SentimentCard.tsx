// components/macro/SentimentCard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";

import { SentimentBar } from "@/components/macro/SentimentBar";
import { Dexter } from "@/components/brand/Dexter";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useEntitlements } from "@/hooks/use-entitlements";
import { interpret } from "@/lib/macro/sentimentInterpretation";
import type { Sentiment } from "@/lib/macro/types";

type Period = "now" | "week" | "month";
type Overall = "risk_on" | "neutral" | "risk_off";
type Trend = "improving" | "deteriorating" | "stable";
type SourceKey = "crypto_fng" | "stocks_fng" | "vix";

interface SourceStats {
  avg: number;
  min: number;
  max: number;
  stddev: number;
  samples: number;
  riskOnPct: number;
  riskOffPct: number;
  deltaAvg: number;
  firstAt: string;
  lastAt: string;
}

interface HistoryOk {
  ok: true;
  period: "week" | "month";
  sources: {
    crypto_fng: SourceStats;
    stocks_fng: SourceStats;
    vix: SourceStats;
  };
  overall: Overall;
  trend: Trend;
  coverageDays: number;
  empty?: false;
}

interface HistoryEmpty {
  ok: true;
  period: "week" | "month";
  empty: true;
  coverageDays: number;
}

type HistoryResponse = HistoryOk | HistoryEmpty;

type CardState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: HistoryResponse }
  | { kind: "paywall" }
  | { kind: "error" };

export interface SentimentCardProps {
  /**
   * Legacy narrative sentiment from the weekly panorama. Currently unused by
   * the history UI — kept for parity with the previous caller and to allow
   * future fallback rendering if needed.
   */
  sentiment?: Sentiment | null;
}

const EASE_APPLE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const OVERALL_BG: Record<Overall, string> = {
  risk_on: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-muted text-foreground/70",
  risk_off: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const OVERALL_LABEL: Record<Overall, string> = {
  risk_on: "Risk-on",
  neutral: "Neutro",
  risk_off: "Risk-off",
};

const TREND_META: Record<
  Trend,
  { arrow: string; label: string; className: string }
> = {
  improving: {
    arrow: "▲",
    label: "Melhorando",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  deteriorating: {
    arrow: "▼",
    label: "Piorando",
    className: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  stable: {
    arrow: "→",
    label: "Estável",
    className: "bg-muted text-muted-foreground",
  },
};

const SOURCE_LABEL: Record<SourceKey, string> = {
  crypto_fng: "Crypto F/G",
  stocks_fng: "Stocks F/G",
  vix: "VIX",
};

const SOURCE_ORDER: SourceKey[] = ["crypto_fng", "stocks_fng", "vix"];

interface SegmentedControlProps {
  period: Period;
  onChange: (p: Period) => void;
}

function SegmentedControl({ period, onChange }: SegmentedControlProps) {
  const options: Array<{ value: Period; label: string }> = [
    { value: "now", label: "Agora" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mês" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5">
      {options.map((opt) => {
        const active = opt.value === period;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors " +
              (active
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "text-muted-foreground hover:text-foreground")
            }
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface DeltaBadgeProps {
  delta: number | null;
  source: SourceKey;
}

function DeltaBadge({ delta, source }: DeltaBadgeProps) {
  if (delta === null || !Number.isFinite(delta)) {
    return (
      <span className="tabular-nums text-[11px] font-semibold text-muted-foreground">
        — sem base
      </span>
    );
  }
  // For F/G sources: positive = improving (emerald). For VIX: inverted.
  const inverted = source === "vix";
  const positiveIsGood = !inverted;
  const epsilon = 0.05;
  let tone: "good" | "bad" | "neutral";
  if (Math.abs(delta) < epsilon) tone = "neutral";
  else if ((delta > 0 && positiveIsGood) || (delta < 0 && !positiveIsGood)) tone = "good";
  else tone = "bad";

  const arrow = Math.abs(delta) < epsilon ? "→" : delta > 0 ? "▲" : "▼";
  const formatted = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;

  const cls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";

  return (
    <span className={`tabular-nums text-[11px] font-semibold ${cls}`}>
      {arrow} {formatted}
    </span>
  );
}

interface SourceRowProps {
  source: SourceKey;
  stats: SourceStats;
}

function SourceRow({ source, stats }: SourceRowProps) {
  // Guard: skip sources with no samples or null aggregates (source missing from window).
  if (stats.samples === 0 || stats.avg === null || stats.min === null || stats.max === null) {
    return null;
  }
  const fmt = (n: number) => (source === "vix" ? n.toFixed(1) : Math.round(n).toString());
  return (
    <div className="rounded-xl border border-border/40 px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {SOURCE_LABEL[source]}
        </span>
        <DeltaBadge delta={stats.deltaAvg} source={source} />
      </div>
      <div className="flex items-baseline gap-3 text-[11px] text-muted-foreground">
        <span>
          avg <span className="font-semibold tabular-nums text-foreground">{fmt(stats.avg)}</span>
        </span>
        <span>
          min <span className="tabular-nums">{fmt(stats.min)}</span>
        </span>
        <span>
          max <span className="tabular-nums">{fmt(stats.max)}</span>
        </span>
      </div>
    </div>
  );
}

function HistoryReady({ data }: { data: HistoryOk }) {
  const { overall, trend, sources } = data;
  const reading = interpret(overall, trend);
  const trendMeta = TREND_META[trend];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${OVERALL_BG[overall]}`}
        >
          {OVERALL_LABEL[overall]}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${trendMeta.className}`}
        >
          <span aria-hidden>{trendMeta.arrow}</span>
          {trendMeta.label}
        </span>
      </div>

      <p className="text-sm leading-snug text-foreground">{reading.headline}</p>

      <div className="space-y-2">
        {SOURCE_ORDER.map((src) => (
          <SourceRow key={src} source={src} stats={sources[src]} />
        ))}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {reading.compensation}
      </p>
    </div>
  );
}

function HistoryEmptyView({ coverageDays }: { coverageDays: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <Dexter mood="thinking" size={40} animated />
      <p className="text-xs text-muted-foreground">
        Coletando dados há {coverageDays}d
      </p>
    </div>
  );
}

function PaywallView() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <div className="relative">
        <Dexter mood="thinking" size={40} animated />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          Desbloqueie histórico no Pro
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Veja médias, tendências e deltas da semana/mês.
        </p>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/25 dark:text-emerald-300"
      >
        Ver planos
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <p className="text-xs text-muted-foreground">
        Falha ao carregar histórico.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function SentimentCard(_props: SentimentCardProps = {}) {
  const { plan } = useEntitlements();
  const [period, setPeriod] = useState<Period>("now");
  const [state, setState] = useState<CardState>({ kind: "idle" });
  const cacheRef = useRef<Map<Period, CardState>>(new Map());

  const loadHistory = useCallback(
    async (target: "week" | "month") => {
      // Free users never hit the network — show paywall.
      if (plan === "free") {
        const next: CardState = { kind: "paywall" };
        cacheRef.current.set(target, next);
        setState(next);
        return;
      }

      setState({ kind: "loading" });
      try {
        const { data } = await safeGetSession();
        const session = data.session;
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(
          `/api/macro/sentiment/history?period=${target}`,
          { headers, cache: "no-store" },
        );
        if (res.status === 402) {
          const next: CardState = { kind: "paywall" };
          cacheRef.current.set(target, next);
          setState(next);
          return;
        }
        if (!res.ok) {
          const next: CardState = { kind: "error" };
          setState(next);
          return;
        }
        const json = (await res.json()) as HistoryResponse;
        if (!json.ok) {
          setState({ kind: "error" });
          return;
        }
        const next: CardState = { kind: "ready", data: json };
        cacheRef.current.set(target, next);
        setState(next);
      } catch {
        setState({ kind: "error" });
      }
    },
    [plan],
  );

  useEffect(() => {
    if (period === "now") {
      // SentimentBar manages its own fetch; card state is idle for this tab.
      setState({ kind: "idle" });
      return;
    }
    const cached = cacheRef.current.get(period);
    if (cached) {
      setState(cached);
      return;
    }
    void loadHistory(period);
  }, [period, loadHistory]);

  const handleRetry = useCallback(() => {
    if (period === "now") return;
    cacheRef.current.delete(period);
    void loadHistory(period);
  }, [period, loadHistory]);

  return (
    <div
      className="flex flex-col h-full rounded-[24px] border border-border/40 p-5 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Sentimento Global
        </h2>
        <SegmentedControl period={period} onChange={setPeriod} />
      </header>

      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={period + ":" + state.kind}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE_APPLE }}
          >
            {period === "now" ? (
              <SentimentBar />
            ) : state.kind === "loading" || state.kind === "idle" ? (
              <LoadingSkeleton />
            ) : state.kind === "paywall" ? (
              <PaywallView />
            ) : state.kind === "error" ? (
              <ErrorView onRetry={handleRetry} />
            ) : state.data.empty ? (
              <HistoryEmptyView coverageDays={state.data.coverageDays} />
            ) : (
              <HistoryReady data={state.data} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
