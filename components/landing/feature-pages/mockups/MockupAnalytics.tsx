"use client";

export function MockupAnalytics() {
  const calendarDays = [
    [280, -150, 320, 0, 180],
    [-90, 450, 120, -200, 340],
    [160, 0, -80, 520, 210],
    [380, -120, 0, 290, -60],
  ];

  const equityPath =
    "M0 70 C15 65, 30 55, 50 50 C70 45, 85 58, 100 42 C115 30, 130 35, 150 25 C170 18, 190 22, 210 12 C230 8, 250 15, 270 5";

  function cellColor(v: number): string {
    if (v > 300) return "hsl(var(--pnl-cell-win))";
    if (v > 0) return "hsl(152 32% 55% / 0.10)";
    if (v === 0) return "hsl(var(--landing-border) / 0.5)";
    if (v > -150) return "hsl(4 45% 55% / 0.10)";
    return "hsl(var(--pnl-cell-loss))";
  }

  function cellText(v: number): string {
    if (v > 0) return "hsl(var(--pnl-text-positive))";
    if (v < 0) return "hsl(var(--pnl-text-negative))";
    return "hsl(var(--landing-text-muted))";
  }

  return (
    <div
      className="relative rounded-2xl border p-5 md:p-6 overflow-hidden"
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
        <span className="font-mono text-xs text-l-text-muted">DASHBOARD</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "P&L", value: "+R$4.280", positive: true },
          { label: "Win Rate", value: "68%", positive: true },
          { label: "PF", value: "2.1", positive: true },
          { label: "RR Médio", value: "1.8", positive: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border px-2.5 py-2"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider">
              {kpi.label}
            </div>
            <div
              className="font-mono text-sm font-bold"
              style={{
                color: kpi.positive
                  ? "hsl(var(--pnl-text-positive))"
                  : "hsl(var(--landing-text))",
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Equity curve mini */}
      <div className="mb-4">
        <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
          Equity Curve
        </div>
        <div
          className="rounded-xl border p-3"
          style={{
            backgroundColor: "hsl(var(--landing-bg-tertiary))",
            borderColor: "hsl(var(--landing-border))",
          }}
        >
          <svg viewBox="0 0 270 75" className="w-full h-auto">
            {[20, 40, 60].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="270"
                y2={y}
                stroke="hsl(var(--landing-grid))"
                strokeWidth="0.5"
              />
            ))}
            <path
              d={`${equityPath} L270 75 L0 75 Z`}
              fill="hsl(var(--landing-accent) / 0.08)"
            />
            <path
              d={equityPath}
              fill="none"
              stroke="hsl(var(--landing-accent))"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="270" cy="5" r="2.5" fill="hsl(var(--landing-accent))" />
          </svg>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div>
        <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
          Calendário P&L
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {calendarDays.flat().map((v, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg flex items-center justify-center"
              style={{ backgroundColor: cellColor(v) }}
            >
              <span
                className="font-mono text-[8px] font-semibold"
                style={{ color: cellText(v) }}
              >
                {v === 0 ? "—" : v > 0 ? `+${v}` : v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating badges */}
      <div
        className="absolute -top-2 -right-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(var(--landing-accent) / 0.3)",
          color: "hsl(var(--landing-accent))",
        }}
      >
        Win Rate 68%
      </div>
      <div
        className="absolute bottom-6 -left-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(152 40% 38% / 0.3)",
          color: "hsl(152 40% 38%)",
        }}
      >
        +R$4.280
      </div>
    </div>
  );
}
