"use client";

import { useState } from "react";
import type { DayData, DayNote } from "./types";
import { formatPnl } from "./utils";

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
  const [viewMode, setViewMode] = useState<"consolidated" | "per-account">(
    "consolidated"
  );

  const winRate =
    dayData && dayData.tradeCount > 0
      ? Math.round((dayData.wins / dayData.tradeCount) * 100)
      : 0;

  const pnlColor = (value: number) =>
    value > 0
      ? "hsl(var(--landing-accent))"
      : value < 0
        ? "hsl(var(--landing-accent-danger))"
        : "hsl(var(--landing-text-muted))";

  if (!selectedDate) {
    return (
      <div
        className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex items-center justify-center"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <p
          className="text-xs text-center"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "12px",
            color: "hsl(var(--landing-text-muted))",
          }}
        >
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
        <span
          className="uppercase tracking-wider"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "8px",
            letterSpacing: "0.05em",
            color: "hsl(var(--landing-text-muted))",
          }}
        >
          {formatDateLabel(selectedDate)}
        </span>
        <span
          className="font-semibold"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "14px",
            color: dayData ? pnlColor(dayData.totalPnl) : "hsl(var(--landing-text-muted))",
          }}
        >
          {dayData ? formatPnl(dayData.totalPnl) : "$0"}
        </span>
      </div>

      {/* KPIs 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "TRADES",
            value: dayData?.tradeCount?.toString() ?? "0",
            color: "hsl(var(--landing-text))",
          },
          {
            label: "WIN RATE",
            value: `${winRate}%`,
            color: "hsl(var(--landing-text))",
          },
          {
            label: "MELHOR",
            value: dayData ? formatPnl(dayData.bestTrade) : "$0",
            color: "hsl(var(--landing-accent))",
          },
          {
            label: "PIOR",
            value: dayData ? formatPnl(dayData.worstTrade) : "$0",
            color: "hsl(var(--landing-accent-danger))",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg p-2.5"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
            }}
          >
            <p
              className="uppercase tracking-wider mb-1"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "8px",
                letterSpacing: "0.05em",
                color: "hsl(var(--landing-text-muted))",
              }}
            >
              {kpi.label}
            </p>
            <p
              className="font-semibold"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "13px",
                color: kpi.color,
              }}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* No trades message */}
      {dayData?.tradeCount === 0 && (
        <p
          className="text-center py-2"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
            color: "hsl(var(--landing-text-muted))",
          }}
        >
          Sem operações neste dia
        </p>
      )}

      {/* Observations */}
      {dayNote?.observation && (
        <div>
          <p
            className="uppercase tracking-wider mb-1.5"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "8px",
              letterSpacing: "0.05em",
              color: "hsl(var(--landing-text-muted))",
            }}
          >
            OBSERVAÇÕES
          </p>
          <p
            className="leading-relaxed"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              color: "hsl(var(--landing-text))",
            }}
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
                className="flex-1 py-1.5 text-center transition-colors"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "10px",
                  letterSpacing: "0.03em",
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
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "11px",
                        color: "hsl(var(--landing-text))",
                      }}
                    >
                      {acc.accountName}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "9px",
                        color: "hsl(var(--landing-text-muted))",
                      }}
                    >
                      {acc.trades} trade{acc.trades !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="font-semibold"
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "12px",
                      color: pnlColor(acc.pnl),
                    }}
                  >
                    {formatPnl(acc.pnl)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execution rating — placeholder */}
      <div>
        <p
          className="uppercase tracking-wider mb-2"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "8px",
            letterSpacing: "0.05em",
            color: "hsl(var(--landing-text-muted))",
          }}
        >
          EXECUÇÃO
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
