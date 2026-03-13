"use client";

/* Realistic journal mockup — monthly calendar + day detail panel */

export function JournalMockup() {
  /* March 2026 calendar data: pnl per day (null = weekend/no trade) */
  const days = [
    /* row 1: Sun-Sat (Mar starts on Sunday) */
    { d: 1, pnl: 420 },
    { d: 2, pnl: -180 },
    { d: 3, pnl: 310 },
    { d: 4, pnl: 0 },
    { d: 5, pnl: 560 },
    { d: 6, pnl: -90 },
    { d: 7, pnl: null },
    /* row 2 */
    { d: 8, pnl: null },
    { d: 9, pnl: 280 },
    { d: 10, pnl: 450 },
    { d: 11, pnl: -320 },
    { d: 12, pnl: 190 },
    { d: 13, pnl: 670 },
    { d: 14, pnl: null },
    /* row 3 */
    { d: 15, pnl: null },
    { d: 16, pnl: -150 },
    { d: 17, pnl: 380 },
    { d: 18, pnl: 520 },
    { d: 19, pnl: -40 },
    { d: 20, pnl: 290 },
    { d: 21, pnl: null },
    /* row 4 — selected day is 18 */
    { d: 22, pnl: null },
    { d: 23, pnl: 410 },
    { d: 24, pnl: -210 },
    { d: 25, pnl: 330 },
    { d: 26, pnl: 480 },
    { d: 27, pnl: 150 },
    { d: 28, pnl: null },
  ];

  const selectedDay = 18;

  function cellColor(pnl: number | null): string {
    if (pnl === null) return "transparent";
    if (pnl > 400) return "hsl(var(--landing-accent) / 0.7)";
    if (pnl > 0) return "hsl(var(--landing-accent) / 0.35)";
    if (pnl === 0) return "hsl(var(--landing-border))";
    return "hsl(var(--landing-accent-danger) / 0.4)";
  }

  return (
    <div className="landing-card overflow-hidden">
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent-danger) / 0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent-warning) / 0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent) / 0.4)" }} />
        </div>
        <span className="font-mono text-[10px] text-l-text-muted ml-2">
          wealth.Investing — Journal
        </span>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Calendar side */}
        <div className="flex-1 p-4 md:p-5">
          {/* Month header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-l-text">Março 2026</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-l-text-muted">P&L:</span>
              <span className="font-mono text-xs font-semibold text-l-text">+R$5.420</span>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} className="text-center font-mono text-[9px] text-l-text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = day.d === selectedDay;
              return (
                <div
                  key={day.d}
                  className="relative aspect-square rounded-lg flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: cellColor(day.pnl),
                    border: isSelected ? "1.5px solid hsl(var(--landing-text) / 0.4)" : "1px solid transparent",
                  }}
                >
                  <span className={`font-mono text-[10px] ${day.pnl === null ? "text-l-text-muted/30" : "text-l-text"} ${isSelected ? "font-bold" : ""}`}>
                    {day.d}
                  </span>
                  {day.pnl !== null && day.pnl !== 0 && (
                    <span className={`font-mono text-[7px] ${day.pnl > 0 ? "text-l-text/70" : "text-l-text/60"}`}>
                      {day.pnl > 0 ? "+" : ""}{day.pnl}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div
          className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-l-text">18 Mar</span>
            <span className="font-mono text-xs font-semibold text-l-text">+R$520</span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Trades", value: "4" },
              { label: "Win Rate", value: "75%" },
              { label: "Melhor", value: "+R$280" },
              { label: "Pior", value: "-R$90" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg px-2.5 py-2"
                style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
              >
                <div className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider">{kpi.label}</div>
                <div className="font-mono text-xs font-semibold text-l-text">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="mb-3">
            <div className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider mb-1.5">Tags do dia</div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Order Block", color: "var(--landing-accent-secondary)" },
                { label: "EUR/USD", color: "var(--landing-text-muted)" },
                { label: "London", color: "var(--landing-accent-warning)" },
                { label: "Focado", color: "var(--landing-accent)" },
              ].map((tag) => (
                <span
                  key={tag.label}
                  className="inline-flex rounded-full px-2 py-0.5 font-mono text-[8px] font-medium"
                  style={{
                    backgroundColor: `hsl(${tag.color} / 0.12)`,
                    color: `hsl(${tag.color})`,
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-3">
            <div className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider mb-1.5">Observações</div>
            <p className="text-[11px] leading-relaxed text-l-text-secondary">
              Dia de boa execução. Respeitei o plano, entrei apenas nos setups definidos no playbook. Único loss foi stop técnico no GBPUSD — sem erro de execução.
            </p>
          </div>

          {/* Execution rating */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider">Execução</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-1.5 w-4 rounded-full"
                  style={{
                    backgroundColor: n <= 4
                      ? "hsl(var(--landing-text) / 0.5)"
                      : "hsl(var(--landing-border))",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Setup */}
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider">Setup principal</span>
            <span className="font-mono text-[10px] text-l-text">Order Block</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[8px] text-l-text-muted uppercase tracking-wider">Emoção</span>
            <span className="font-mono text-[10px] text-l-text">Focado / Confiante</span>
          </div>
        </div>
      </div>
    </div>
  );
}
