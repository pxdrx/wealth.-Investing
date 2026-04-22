// components/macro/SentimentBar.tsx
"use client";

import { useEffect, useState } from "react";
import type { Sentiment } from "@/lib/macro/types";
import { useAppT } from "@/hooks/useAppLocale";

interface SentimentBarProps {
  /**
   * Legacy prop kept for backwards compatibility with callers that still
   * pass a narrative sentiment from the weekly panorama. Ignored once the
   * live /api/macro/sentiment response is available.
   */
  sentiment?: Sentiment | null;
}

type Overall = "risk_on" | "neutral" | "risk_off";

interface Reading {
  value: number | null;
  label: string | null;
}

interface SentimentResponse {
  ok: boolean;
  crypto?: Reading;
  stocks?: Reading;
  vix?: Reading;
  overall?: Overall;
  captured_at?: string;
  error?: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: SentimentResponse }
  | { kind: "error" };

const OVERALL_BG: Record<Overall, string> = {
  risk_on: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-muted text-foreground/70",
  risk_off: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const OVERALL_KEY: Record<Overall, "macro.sentiment.riskOn" | "macro.sentiment.neutral" | "macro.sentiment.riskOff"> = {
  risk_on: "macro.sentiment.riskOn",
  neutral: "macro.sentiment.neutral",
  risk_off: "macro.sentiment.riskOff",
};

function gaugeColor(value: number, inverted = false): string {
  // For F&G: 0 fear (red) → 100 greed (green). VIX inverts (high = stress = red).
  const v = inverted ? 100 - Math.min(value, 50) * 2 : value;
  if (v < 25) return "bg-red-500";
  if (v < 45) return "bg-orange-400";
  if (v <= 55) return "bg-yellow-400";
  if (v <= 75) return "bg-emerald-500";
  return "bg-emerald-600";
}

function Gauge({
  title,
  reading,
  max = 100,
  inverted = false,
  suffix,
}: {
  title: string;
  reading: Reading | undefined;
  max?: number;
  inverted?: boolean;
  suffix?: string;
}) {
  const value = reading?.value ?? null;
  const label = reading?.label ?? "—";
  const pct = value !== null ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = value !== null ? gaugeColor(value, inverted) : "bg-muted";
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {value !== null ? `${value}${suffix ?? ""}` : "—"}
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted/60">
        <div className={`${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function SentimentBar({ sentiment: _legacy }: SentimentBarProps = {}) {
  const t = useAppT();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/macro/sentiment", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ kind: "error" });
          return;
        }
        const data: SentimentResponse = await res.json();
        if (cancelled) return;
        if (!data.ok) {
          setState({ kind: "error" });
          return;
        }
        setState({ kind: "ready", data });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="space-y-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="text-xs text-muted-foreground">{t("macro.sentiment.empty")}</p>
    );
  }

  const { crypto, stocks, vix, overall } = state.data;
  const overallKey: Overall = overall ?? "neutral";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${OVERALL_BG[overallKey]}`}
        >
          {t(OVERALL_KEY[overallKey])}
        </span>
        <span className="text-[10px] text-muted-foreground">{t("macro.sentiment.caption")}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Gauge title={t("macro.sentiment.crypto")} reading={crypto} />
        <Gauge title={t("macro.sentiment.stocks")} reading={stocks} />
        <Gauge title={t("macro.sentiment.vix")} reading={vix} max={50} inverted suffix="" />
      </div>
    </div>
  );
}
