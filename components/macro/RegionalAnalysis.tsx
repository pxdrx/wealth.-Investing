// components/macro/RegionalAnalysis.tsx
"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RegionalAnalysis as RegionalAnalysisType } from "@/lib/macro/types";

interface RegionalAnalysisProps {
  data: RegionalAnalysisType | null;
}

const OUTLOOK_CONFIG = {
  bullish: { icon: TrendingUp, color: "text-emerald-500", label: "Bullish" },
  neutral: { icon: Minus, color: "text-gray-400", label: "Neutro" },
  bearish: { icon: TrendingDown, color: "text-red-500", label: "Bearish" },
} as const;

const REGION_EMOJI: Record<string, string> = {
  americas: "🌎",
  europe: "🌍",
  asia_pacific: "🌏",
};

export function RegionalAnalysis({ data }: RegionalAnalysisProps) {
  if (!data) return null;

  const regions = [
    { key: "americas" as const, data: data.americas },
    { key: "europe" as const, data: data.europe },
    { key: "asia_pacific" as const, data: data.asia_pacific },
  ];

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
      {regions.map(({ key, data: region }) => {
        const outlook = OUTLOOK_CONFIG[region.outlook];
        const OutlookIcon = outlook.icon;

        return (
          <div
            key={key}
            className="rounded-[22px] p-5"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <span>{REGION_EMOJI[key]}</span>
                {region.title}
              </h4>
              <span className={`flex items-center gap-1 text-xs font-medium ${outlook.color}`}>
                <OutlookIcon className="h-3.5 w-3.5" />
                {outlook.label}
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {region.summary}
            </p>
            <ul className="space-y-1">
              {region.key_events.map((event, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {event}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
