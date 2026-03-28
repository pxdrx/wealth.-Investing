"use client";

export function MockupDashboard() {
  /* Equity curve SVG path — ascending with realistic dips */
  const curvePath =
    "M0 80 C20 75, 40 60, 60 55 C80 50, 100 65, 120 50 C140 35, 160 40, 180 30 C200 25, 220 20, 240 15 C260 12, 280 18, 300 10 C320 5, 340 8, 360 3";

  /* Mini calendar heatmap data — 5 weeks × 5 days */
  const calendarDays = [
    [2, 3, -1, 2, 1],
    [1, -2, 3, 1, 2],
    [-1, 2, 2, 3, -1],
    [3, 1, -1, 2, 3],
    [2, 2, 1, -2, 2],
  ];

  function dayColor(v: number): string {
    if (v >= 3) return "hsl(var(--landing-accent))";
    if (v >= 1) return "hsl(var(--landing-accent) / 0.5)";
    if (v === 0) return "hsl(var(--landing-border))";
    return "hsl(var(--landing-accent-danger) / 0.6)";
  }

  return (
    <div
      className="relative rounded-[22px] border p-4 md:p-6 overflow-hidden"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "hsl(var(--landing-accent))" }}
          />
          <span className="font-mono text-xs text-l-text-muted">
            DASHBOARD
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-l-text-muted/30" />
          <div className="h-2 w-2 rounded-full bg-l-text-muted/30" />
          <div className="h-2 w-2 rounded-full bg-l-text-muted/30" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Win Rate", value: "68%", color: "var(--landing-accent)" },
          { label: "Profit Factor", value: "2.1", color: "var(--landing-accent)" },
          { label: "Avg R", value: "+1.4R", color: "var(--landing-accent)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border px-3 py-2.5"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[10px] text-l-text-muted uppercase tracking-wider mb-1">
              {stat.label}
            </div>
            <div
              className="font-mono text-lg font-bold"
              style={{ color: `hsl(${stat.color})` }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div className="mb-5">
        <div className="font-mono text-[10px] text-l-text-muted uppercase tracking-wider mb-2">
          Equity Curve
        </div>
        <div
          className="rounded-xl border p-3 overflow-hidden"
          style={{
            backgroundColor: "hsl(var(--landing-bg-tertiary))",
            borderColor: "hsl(var(--landing-border))",
          }}
        >
          <svg viewBox="0 0 360 85" className="w-full h-auto">
            {/* Grid lines */}
            {[20, 40, 60].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="360"
                y2={y}
                stroke="hsl(var(--landing-grid))"
                strokeWidth="0.5"
              />
            ))}
            {/* Area fill */}
            <path
              d={`${curvePath} L360 85 L0 85 Z`}
              fill="hsl(var(--landing-accent) / 0.1)"
            />
            {/* Line */}
            <path
              d={curvePath}
              fill="none"
              stroke="hsl(var(--landing-accent))"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* End dot */}
            <circle cx="360" cy="3" r="3" fill="hsl(var(--landing-accent))" />
          </svg>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div>
        <div className="font-mono text-[10px] text-l-text-muted uppercase tracking-wider mb-2">
          P&L Calendar
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {calendarDays.flat().map((v, i) => (
            <div
              key={i}
              className="aspect-square rounded-md"
              style={{ backgroundColor: dayColor(v) }}
            />
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
        className="absolute top-1/3 -right-3 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(var(--landing-accent) / 0.3)",
          color: "hsl(var(--landing-accent))",
        }}
      >
        +2.4R
      </div>
      <div
        className="absolute bottom-8 -left-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(var(--landing-accent-warning) / 0.3)",
          color: "hsl(var(--landing-accent-warning))",
        }}
      >
        Drawdown 3.2%
      </div>
    </div>
  );
}
