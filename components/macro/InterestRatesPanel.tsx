// components/macro/InterestRatesPanel.tsx
"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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
  hike: { icon: TrendingUp, color: "text-red-500", label: "Alta" },
  cut: { icon: TrendingDown, color: "text-emerald-500", label: "Corte" },
  hold: { icon: Minus, color: "text-gray-400", label: "Manteve" },
} as const;

// Only show these 6 central banks
const VISIBLE_BANKS = new Set(["BCB", "BOC", "BOE", "BOJ", "ECB", "FED"]);

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InterestRatesPanel({ rates }: InterestRatesPanelProps) {
  const filteredRates = rates.filter((r) => VISIBLE_BANKS.has(r.bank_code));

  if (!filteredRates.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Taxas de juros ainda não disponíveis.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {filteredRates.map((rate) => {
        const action = rate.last_action ? ACTION_CONFIG[rate.last_action] : null;
        const ActionIcon = action?.icon || Minus;
        const flagCode = FLAG_CODES[rate.country];

        return (
          <div
            key={rate.bank_code}
            className="flex flex-col rounded-[16px] border border-border/30 p-4"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div className="mb-2 flex items-center gap-2">
              {flagCode ? (
                <img
                  src={`https://flagcdn.com/20x15/${flagCode}.png`}
                  alt={rate.country}
                  width={20}
                  height={15}
                  className="rounded-[2px] shrink-0"
                />
              ) : (
                <span className="text-xs">{rate.country}</span>
              )}
              <span className="text-xs font-semibold tracking-wide">{rate.bank_code}</span>
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {rate.current_rate.toFixed(2)}%
            </div>
            {action && (
              <div className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${action.color}`}>
                <ActionIcon className="h-3 w-3 shrink-0" />
                <span>
                  {action.label} {rate.last_change_bps ? `${Math.abs(rate.last_change_bps)}bps` : ""}
                </span>
              </div>
            )}
            {rate.next_meeting && (
              <div className="mt-auto pt-3">
                <div className="text-[11px] leading-snug text-muted-foreground">
                  Próx. reunião: {formatDate(rate.next_meeting)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
