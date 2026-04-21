"use client";

import type { JournalTradeRow } from "./types";
import { TradeNarrativeCard } from "./TradeNarrativeCard";
import { usePrivacy } from "@/components/context/PrivacyContext";

interface Props {
  trades: JournalTradeRow[];
  onTradeClick: (trade: JournalTradeRow) => void;
}

export function TradeNarrativeList({ trades, onTradeClick }: Props) {
  const { hidden } = usePrivacy();

  if (trades.length === 0) {
    return (
      <div
        className="rounded-[22px] border border-dashed border-border/70 p-10 text-center"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <p className="text-sm text-muted-foreground">
          Nenhum trade encontrado para a conta selecionada.
        </p>
      </div>
    );
  }

  // trades arrive ascending — show newest first in narrative view
  const ordered = [...trades].reverse();

  return (
    <div className="grid gap-4">
      {ordered.map((trade) => (
        <TradeNarrativeCard
          key={trade.id}
          trade={trade}
          onOpenDetails={onTradeClick}
          showPnl={!hidden}
        />
      ))}
    </div>
  );
}
