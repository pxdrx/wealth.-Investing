"use client";

import { useState } from "react";
import type { DayData, DayNote } from "./types";
import { formatPnl } from "./utils";
import { usePrivacy } from "@/components/context/PrivacyContext";

interface DayDetailPanelProps {
  selectedDate: string | null;
  dayData: DayData | null;
  dayNote: DayNote | null;
  showConsolidatedToggle?: boolean;
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function DayDetailPanel({
  selectedDate,
  dayData,
  dayNote,
  showConsolidatedToggle,
}: DayDetailPanelProps) {
  const { mask } = usePrivacy();
  const [viewMode, setViewMode] = useState<"consolidated" | "per-account">(
    "consolidated"
  );

  const winRate =
    dayData && dayData.tradeCount > 0
      ? Math.round((dayData.wins / dayData.tradeCount) * 100)
      : 0;

  const pnlColor = (value: number) =>
    value > 0
      ? "hsl(var(--pnl-positive))"
      : value < 0
        ? "hsl(var(--pnl-negative))"
        : "hsl(var(--landing-text-muted))";

  if (!selectedDate) {
    return (
      <div
        className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex items-center justify-center"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <p className="text-xs text-center text-muted-foreground">
          Selecione um dia para ver detalhes.
        </p>
      </div>
    );
  }

  return (
    <div
      className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex flex-col gap-4 overflow-y-auto"
      style={{ borderColor: "hsl(var(--landing-border))" }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
          {formatDateLabel(selectedDate)}
        </span>
        <span
          className="text-base font-semibold tabular-nums"
          style={{
            color: dayData ? pnlColor(dayData.totalPnl) : "hsl(var(--landing-text-muted))",
          }}
        >
          {mask(dayData ? formatPnl(dayData.totalPnl) : "$0")}
        </span>
      </div>

      {/* KPIs 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "Trades",
            value: dayData?.tradeCount?.toString() ?? "0",
            color: "hsl(var(--landing-text))",
          },
          {
            label: "Win Rate",
            value: `${winRate}%`,
            color: "hsl(var(--landing-text))",
          },
          {
            label: "Melhor",
            value: dayData && dayData.bestTrade !== 0 ? formatPnl(dayData.bestTrade) : "$0",
            color: dayData && dayData.bestTrade > 0 ? "hsl(var(--pnl-positive))" : "hsl(var(--landing-text-muted))",
          },
          {
            label: "Pior",
            value: dayData && dayData.worstTrade !== 0 ? formatPnl(dayData.worstTrade) : "$0",
            color: dayData && dayData.worstTrade < 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg p-2.5"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
            }}
          >
            <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">
              {kpi.label}
            </p>
            <p
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: kpi.color }}
            >
              {mask(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* No trades message */}
      {dayData?.tradeCount === 0 && (
        <p className="text-center py-2 text-[11px] text-muted-foreground">
          Sem operações neste dia
        </p>
      )}

      {/* Observations */}
      {dayNote?.observation && (
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1.5 text-muted-foreground">
            Observações
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "hsl(var(--landing-text))" }}
          >
            {dayNote.observation}
          </p>
        </div>
      )}

      {/* Consolidated / Per-account toggle */}
      {showConsolidatedToggle && dayData?.byAccount && (
        <div>
          <div
            className="flex rounded-lg overflow-hidden mb-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
            }}
          >
            {(
              [
                { key: "consolidated", label: "Consolidado" },
                { key: "per-account", label: "Por conta" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className="flex-1 py-1.5 text-center text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor:
                    viewMode === tab.key
                      ? "hsl(var(--landing-text))"
                      : "transparent",
                  color:
                    viewMode === tab.key
                      ? "hsl(var(--landing-bg))"
                      : "hsl(var(--landing-text-muted))",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewMode === "per-account" && (
            <div className="flex flex-col gap-2">
              {Object.entries(dayData.byAccount).map(([accId, acc]) => (
                <div
                  key={accId}
                  className="flex items-center justify-between rounded-lg p-2.5"
                  style={{
                    backgroundColor: "hsl(var(--landing-bg-tertiary))",
                  }}
                >
                  <div>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "hsl(var(--landing-text))" }}
                    >
                      {acc.accountName}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {acc.trades} trade{acc.trades !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: pnlColor(acc.pnl) }}
                  >
                    {mask(formatPnl(acc.pnl))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execution rating — placeholder */}
      <div>
        <p className="text-[9px] uppercase tracking-wider mb-2 text-muted-foreground">
          Execução
        </p>
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full"
              style={{
                backgroundColor: "hsl(var(--landing-border))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
