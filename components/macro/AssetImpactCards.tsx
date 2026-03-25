// components/macro/AssetImpactCards.tsx
"use client";

import { TrendingUp, TrendingDown, Minus, BarChart3, CircleDollarSign, Bitcoin, Gem } from "lucide-react";
import type { AssetImpacts, AssetImpact } from "@/lib/macro/types";

interface AssetImpactCardsProps {
  impacts: AssetImpacts | null;
}

const ASSETS = [
  { key: "indices", label: "Indices", icon: BarChart3 },
  { key: "gold", label: "Ouro", icon: Gem },
  { key: "btc", label: "Bitcoin", icon: Bitcoin },
  { key: "dollar", label: "Dolar", icon: CircleDollarSign },
] as const;

function BiasIcon({ bias }: { bias: string }) {
  if (bias === "bullish") return <TrendingUp className="h-5 w-5 text-emerald-500" />;
  if (bias === "bearish") return <TrendingDown className="h-5 w-5 text-red-500" />;
  return <Minus className="h-5 w-5 text-gray-400" />;
}

function BiasLabel({ bias }: { bias: string }) {
  const config = {
    bullish: { text: "Bullish", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    bearish: { text: "Bearish", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
    neutral: { text: "Neutro", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30" },
  };
  const c = config[bias as keyof typeof config] || config.neutral;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${c.color}`}>{c.text}</span>;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    alta: "text-emerald-500",
    media: "text-amber-500",
    baixa: "text-gray-400",
  };
  return (
    <span className={`text-[10px] font-medium uppercase tracking-wider ${colors[confidence] || colors.baixa}`}>
      Confianca {confidence}
    </span>
  );
}

export function AssetImpactCards({ impacts }: AssetImpactCardsProps) {
  if (!impacts) {
    return (
      <div className="rounded-xl border border-border/30 bg-muted/10 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Regenere o relatório para ver a análise de impacto por ativo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ASSETS.map(({ key, label, icon: Icon }) => {
        const raw = impacts[key as keyof AssetImpacts];
        // Skip non-AssetImpact fields (daily_update, daily_update_at)
        const impact: AssetImpact | undefined = (typeof raw === "object" && raw !== null) ? raw as AssetImpact : undefined;
        if (!impact) return null;

        return (
          <div
            key={key}
            className="rounded-[22px] border border-border/40 p-5 isolate"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-sm tracking-tight">{label}</span>
              </div>
              <BiasIcon bias={impact.bias} />
            </div>

            {/* Bias + Confidence */}
            <div className="flex items-center gap-2 mb-3">
              <BiasLabel bias={impact.bias} />
              <ConfidenceBadge confidence={impact.confidence} />
            </div>

            {/* Reason */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {impact.reason}
            </p>

            {/* Key Levels */}
            {impact.key_levels && (
              <div className="text-xs text-muted-foreground/70 font-mono">
                {impact.key_levels}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
