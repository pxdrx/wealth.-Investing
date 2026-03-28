"use client";

import { Search } from "lucide-react";

const recentAnalyses = [
  { symbol: "XAUUSD", type: "Forex", date: "26 Mar" },
  { symbol: "BTC", type: "Crypto", date: "25 Mar" },
  { symbol: "NVDA", type: "Stock", date: "25 Mar" },
  { symbol: "AAPL", type: "Stock", date: "24 Mar" },
];

export function MockupDexter() {
  return (
    <div
      className="relative rounded-[22px] border overflow-hidden"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <span className="text-sm font-semibold text-l-text">Analista Dexter</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold"
          style={{ backgroundColor: "hsl(152 40% 38% / 0.12)", color: "hsl(152 40% 38%)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(152 40% 38%)" }} />
          IA
        </span>
      </div>

      {/* Search bar */}
      <div className="px-5 py-3.5 border-b" style={{ borderColor: "hsl(var(--landing-border))" }}>
        <div
          className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
          style={{
            backgroundColor: "hsl(var(--landing-bg-tertiary))",
            borderColor: "hsl(var(--landing-border))",
          }}
        >
          <Search className="h-3.5 w-3.5 text-l-text-muted shrink-0" />
          <span className="text-xs text-l-text-muted flex-1">
            Bitcoin, Ouro, EURUSD, Apple, S&P 500...
          </span>
          <span
            className="rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold"
            style={{
              backgroundColor: "hsl(var(--landing-accent))",
              color: "white",
            }}
          >
            Analisar
          </span>
        </div>
      </div>

      {/* Recent analyses */}
      <div className="px-5 py-4">
        <span className="font-mono text-[8px] uppercase tracking-wider text-l-text-muted">
          ANALISES RECENTES
        </span>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {recentAnalyses.map((a) => (
            <div
              key={a.symbol}
              className="flex items-center justify-between rounded-xl border px-3.5 py-2.5"
              style={{
                backgroundColor: "hsl(var(--landing-bg-tertiary))",
                borderColor: "hsl(var(--landing-border))",
              }}
            >
              <div>
                <p className="text-xs font-semibold text-l-text">{a.symbol}</p>
                <p className="font-mono text-[9px] text-l-text-muted">{a.type}</p>
              </div>
              <span className="font-mono text-[9px] text-l-text-muted">{a.date}</span>
            </div>
          ))}
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
        30+ Confluencias
      </div>
    </div>
  );
}
