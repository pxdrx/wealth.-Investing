"use client";

import { FlaskConical, TrendingUp, TrendingDown } from "lucide-react";

export function MockupBacktestDetail() {
  const weeklyPnl = [180, -60, 240, -120, 310, 90, -40, 200, -80, 150, 280, -30];
  const max = Math.max(...weeklyPnl.map(Math.abs));

  return (
    <div className="p-5 md:p-8">
      {/* Strategy selector */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { name: "SMC Strategy", active: true },
          { name: "ICT OTE", active: false },
          { name: "Price Action", active: false },
        ].map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-2"
            style={{
              backgroundColor: s.active
                ? "hsl(var(--landing-accent) / 0.08)"
                : "hsl(var(--landing-bg-tertiary))",
              borderColor: s.active
                ? "hsl(var(--landing-accent) / 0.2)"
                : "hsl(var(--landing-border))",
            }}
          >
            <FlaskConical
              className="h-3 w-3"
              style={{
                color: s.active
                  ? "hsl(var(--landing-accent))"
                  : "hsl(var(--landing-text-secondary))",
              }}
            />
            <span
              className="font-mono text-[10px] font-semibold"
              style={{
                color: s.active
                  ? "hsl(var(--landing-accent))"
                  : "hsl(var(--landing-text-secondary))",
              }}
            >
              {s.name}
            </span>
          </div>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Win Rate", value: "67.3%", positive: true },
          { label: "Profit Factor", value: "1.82", positive: true },
          { label: "Max Drawdown", value: "-4.2%", positive: false },
          { label: "Total P&L", value: "+R$3.480", positive: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border px-4 py-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-1">
              {kpi.label}
            </div>
            <div
              className="font-mono text-lg font-bold"
              style={{
                color: kpi.positive
                  ? "hsl(var(--pnl-text-positive))"
                  : "hsl(var(--pnl-text-negative))",
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: P&L chart */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            P&L por Dia (ultimos 12 dias)
          </div>
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="flex items-end gap-1.5 h-24">
              {weeklyPnl.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div
                    className="w-full rounded-t-sm min-h-[2px]"
                    style={{
                      height: `${(Math.abs(v) / max) * 100}%`,
                      backgroundColor:
                        v >= 0
                          ? "hsl(var(--landing-accent) / 0.6)"
                          : "hsl(var(--landing-accent-danger) / 0.5)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Recent trades */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Ultimos Trades Registrados
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "hsl(var(--landing-border))" }}
          >
            <div
              className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-l-text-muted"
              style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
            >
              <span>Ativo</span>
              <span>Direcao</span>
              <span className="text-right">P&L</span>
              <span className="text-right">RR</span>
            </div>
            {[
              { symbol: "XAU/USD", dir: "Buy", pnl: "+R$280", rr: "1.8", positive: true },
              { symbol: "EUR/USD", dir: "Sell", pnl: "-R$90", rr: "-0.6", positive: false },
              { symbol: "NAS100", dir: "Buy", pnl: "+R$420", rr: "2.4", positive: true },
              { symbol: "GBP/JPY", dir: "Buy", pnl: "+R$150", rr: "1.0", positive: true },
              { symbol: "EUR/USD", dir: "Buy", pnl: "-R$60", rr: "-0.4", positive: false },
            ].map((trade, i) => (
              <div
                key={i}
                className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t text-xs"
                style={{ borderColor: "hsl(var(--landing-border))" }}
              >
                <span className="font-medium text-l-text">{trade.symbol}</span>
                <span className="flex items-center gap-1 text-l-text-muted">
                  {trade.positive ? (
                    <TrendingUp className="h-3 w-3" style={{ color: "hsl(152 40% 38%)" }} />
                  ) : (
                    <TrendingDown className="h-3 w-3" style={{ color: "hsl(4 50% 52%)" }} />
                  )}
                  {trade.dir}
                </span>
                <span
                  className="text-right font-mono font-semibold"
                  style={{
                    color: trade.positive
                      ? "hsl(var(--pnl-text-positive))"
                      : "hsl(var(--pnl-text-negative))",
                  }}
                >
                  {trade.pnl}
                </span>
                <span
                  className="text-right font-mono font-semibold"
                  style={{
                    color: trade.positive
                      ? "hsl(var(--pnl-text-positive))"
                      : "hsl(var(--pnl-text-negative))",
                  }}
                >
                  {trade.rr}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { label: "Melhor Setup", value: "FVG Fill", sub: "78% win rate" },
          { label: "Melhor Ativo", value: "XAU/USD", sub: "PF 2.4" },
          { label: "Melhor Sessao", value: "London", sub: "72% win rate" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border px-3 py-2.5 text-center"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider">
              {m.label}
            </div>
            <div
              className="font-mono text-base font-bold"
              style={{ color: "hsl(var(--landing-accent))" }}
            >
              {m.value}
            </div>
            <div className="font-mono text-[8px] text-l-text-muted">
              {m.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
