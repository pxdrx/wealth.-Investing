"use client";

import { FlaskConical } from "lucide-react";

export function MockupBacktest() {
  const calendarDays = [
    120, -80, 0, 240, -40, 180, 0, -120, 310, 60,
    -90, 200, 0, 150, -60, 0, 280, -30, 90, -150,
  ];

  return (
    <div
      className="relative rounded-[22px] border p-5 md:p-6 overflow-hidden"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "hsl(var(--landing-accent))" }}
        />
        <span className="font-mono text-xs text-l-text-muted">
          BACKTEST — SMC STRATEGY
        </span>
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "Win Rate", value: "67%" },
          { label: "PF", value: "1.8" },
          { label: "Trades", value: "48" },
          { label: "RR Medio", value: "1.6" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="text-center rounded-xl border px-2 py-2.5"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div
              className="font-mono text-sm font-bold"
              style={{ color: "hsl(var(--landing-accent))" }}
            >
              {kpi.value}
            </div>
            <div className="font-mono text-[8px] text-l-text-muted uppercase">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar heatmap */}
      <div className="mb-5">
        <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
          Calendario — Mar 2026
        </div>
        <div
          className="rounded-xl border p-3"
          style={{
            backgroundColor: "hsl(var(--landing-bg-tertiary))",
            borderColor: "hsl(var(--landing-border))",
          }}
        >
          <div className="grid grid-cols-5 gap-1.5 mb-1.5">
            {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d) => (
              <div
                key={d}
                className="text-center font-mono text-[8px] text-l-text-muted"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {calendarDays.map((v, i) => {
              let bg = "hsl(var(--landing-border) / 0.5)";
              if (v > 200) bg = "hsl(var(--pnl-cell-win))";
              else if (v > 0) bg = "hsl(152 32% 55% / 0.10)";
              else if (v < -100) bg = "hsl(var(--pnl-cell-loss))";
              else if (v < 0) bg = "hsl(4 45% 55% / 0.10)";
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md"
                  style={{ backgroundColor: bg }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick trade form */}
      <div
        className="rounded-xl border p-3"
        style={{
          backgroundColor: "hsl(var(--landing-bg-tertiary))",
          borderColor: "hsl(var(--landing-border))",
        }}
      >
        <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
          Trade Rapido
        </div>
        <div className="flex items-center gap-2">
          {/* Asset buttons */}
          <div className="flex gap-1">
            {["XAUUSD", "EURUSD", "NAS100"].map((asset, i) => (
              <span
                key={asset}
                className="inline-flex rounded-lg px-2 py-1 font-mono text-[9px] font-medium"
                style={{
                  backgroundColor:
                    i === 0
                      ? "hsl(var(--landing-accent) / 0.15)"
                      : "hsl(var(--landing-bg-elevated))",
                  color:
                    i === 0
                      ? "hsl(var(--landing-accent))"
                      : "hsl(var(--landing-text-secondary))",
                }}
              >
                {asset}
              </span>
            ))}
          </div>
          {/* Buy/Sell */}
          <div className="flex gap-1 ml-auto">
            <span
              className="inline-flex rounded-lg px-2.5 py-1 font-mono text-[9px] font-bold"
              style={{
                backgroundColor: "hsl(152 40% 38% / 0.12)",
                color: "hsl(152 40% 38%)",
              }}
            >
              BUY
            </span>
            <span
              className="inline-flex rounded-lg px-2.5 py-1 font-mono text-[9px] font-bold"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                color: "hsl(var(--landing-text-secondary))",
              }}
            >
              SELL
            </span>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div
        className="absolute -top-2 -right-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(var(--landing-accent) / 0.3)",
          color: "hsl(var(--landing-accent))",
        }}
      >
        0 risco
      </div>
    </div>
  );
}
