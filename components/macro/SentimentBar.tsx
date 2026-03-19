// components/macro/SentimentBar.tsx
"use client";

import type { Sentiment } from "@/lib/macro/types";

interface SentimentBarProps {
  sentiment: Sentiment | null;
}

export function SentimentBar({ sentiment }: SentimentBarProps) {
  if (!sentiment) return null;

  const { bullish_pct, neutral_pct, bearish_pct } = sentiment;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Bullish {bullish_pct}%</span>
        <span>Neutro {neutral_pct}%</span>
        <span>Bearish {bearish_pct}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${bullish_pct}%` }}
        />
        <div
          className="bg-gray-400 transition-all"
          style={{ width: `${neutral_pct}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${bearish_pct}%` }}
        />
      </div>
    </div>
  );
}
