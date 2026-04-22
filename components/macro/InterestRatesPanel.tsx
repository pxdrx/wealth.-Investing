// components/macro/InterestRatesPanel.tsx
"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import type { CentralBankRate } from "@/lib/macro/types";

interface InterestRatesPanelProps {
  rates: CentralBankRate[];
}

const FLAG_CODES: Record<string, string> = {
  US: "us", EU: "eu", GB: "gb", JP: "jp", BR: "br",
  CA: "ca", AU: "au", NZ: "nz", CH: "ch", MX: "mx",
  CN: "cn", DE: "de", FR: "fr", IT: "it", ES: "es",
};

const ACTION_CONFIG = {
  hike: { icon: TrendingUp, color: "text-emerald-500", label: "Alta" },
  cut: { icon: TrendingDown, color: "text-red-500", label: "Corte" },
  hold: { icon: Minus, color: "text-gray-400", label: "Manteve" },
} as const;

const VISIBLE_BANKS = new Set(["BCB", "BOC", "BOE", "BOJ", "ECB", "FED"]);

const STALE_DAYS_THRESHOLD = 7;
const MS_PER_DAY = 86_400_000;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00").getTime();
  const now = Date.now();
  const diff = Math.ceil((target - now) / MS_PER_DAY);
  return diff > 0 ? diff : null;
}

function isStale(updatedAt: string): boolean {
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(updated)) return false;
  return (Date.now() - updated) / MS_PER_DAY > STALE_DAYS_THRESHOLD;
}

function deltaLabel(bps: number | null, action: "hold" | "cut" | "hike" | null): { text: string; color: string } {
  if (action === "hold") return { text: "0 bps", color: "text-gray-400" };
  if (!action || bps === null || bps === 0) {
    return { text: "—", color: "text-muted-foreground" };
  }
  const abs = Math.abs(bps);
  if (action === "cut") return { text: `-${abs} bps`, color: "text-red-500" };
  if (action === "hike") return { text: `+${abs} bps`, color: "text-emerald-500" };
  return { text: "—", color: "text-muted-foreground" };
}

export function InterestRatesPanel({ rates }: InterestRatesPanelProps) {
  const filteredRates = rates.filter((r) => VISIBLE_BANKS.has(r.bank_code));
  const [heroBankCode, setHeroBankCode] = useState<string>("FED");

  if (!filteredRates.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Taxas de juros ainda não disponíveis.
      </p>
    );
  }

  const hero = filteredRates.find((r) => r.bank_code === heroBankCode) ?? filteredRates[0];
  const others = filteredRates.filter((r) => r.bank_code !== hero.bank_code);

  const heroAction = hero.last_action ? ACTION_CONFIG[hero.last_action] : null;
  const HeroActionIcon = heroAction?.icon;
  const heroFlagCode = FLAG_CODES[hero.country];
  const heroDaysUntil = daysUntil(hero.next_meeting);
  const heroStale = isStale(hero.updated_at);
  const heroFallback = hero.source_confidence === "fallback";

  return (
    <div>
      {/* Hero card */}
      <div
        className="rounded-[18px] border border-border/30 p-5"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {heroFlagCode ? (
              <img
                src={`https://flagcdn.com/40x30/${heroFlagCode}.png`}
                alt={hero.country}
                width={32}
                height={24}
                className="rounded-[3px] shrink-0"
              />
            ) : (
              <span className="text-sm">{hero.country}</span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{hero.bank_name}</span>
                <span className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
                  {hero.bank_code}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end shrink-0">
            {heroFallback && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Dados em cache
              </span>
            )}
            {heroStale && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Desatualizado
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 text-4xl font-bold tracking-tight">
          {hero.current_rate.toFixed(2)}%
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {heroAction && HeroActionIcon && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${heroAction.color}`}>
              <HeroActionIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {heroAction.label}
                {hero.last_change_bps ? ` ${Math.abs(hero.last_change_bps)}bps` : ""}
                {hero.last_change_date ? ` · ${formatDate(hero.last_change_date)}` : ""}
              </span>
            </div>
          )}
          {hero.next_meeting && (
            <div className="text-xs text-muted-foreground">
              Próx. reunião: {formatDate(hero.next_meeting)}
              {heroDaysUntil !== null ? ` (em ${heroDaysUntil} ${heroDaysUntil === 1 ? "dia" : "dias"})` : ""}
            </div>
          )}
        </div>

        {hero.summary && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {hero.summary}
          </p>
        )}

        {hero.source_url && (
          <div className="mt-3">
            <a
              href={hero.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Fonte: TradingEconomics
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Compact list */}
      <div className="mt-3 space-y-1">
        {others.map((rate) => {
          const flagCode = FLAG_CODES[rate.country];
          const delta = deltaLabel(rate.last_change_bps, rate.last_action);

          return (
            <button
              key={rate.bank_code}
              type="button"
              onClick={() => setHeroBankCode(rate.bank_code)}
              className="flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-muted/50 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {flagCode ? (
                  <img
                    src={`https://flagcdn.com/24x18/${flagCode}.png`}
                    alt={rate.country}
                    width={18}
                    height={14}
                    className="rounded-[2px] shrink-0"
                  />
                ) : (
                  <span className="text-[11px]">{rate.country}</span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wide shrink-0">
                  {rate.bank_code}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {rate.bank_name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold tabular-nums">
                  {rate.current_rate.toFixed(2)}%
                </span>
                <span className={`text-xs tabular-nums ${delta.color}`}>
                  {delta.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
