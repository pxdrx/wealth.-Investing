"use client";

export function VisualRegistre() {
  const connections = [
    { label: "Conta MT5", detail: "342 trades" },
    { label: "Mesa FTMO", detail: "Fase 2" },
    { label: "Conta Binance", detail: "Spot" },
    { label: "Import CSV", detail: "1.247 operações" },
  ];

  return (
    <div className="relative flex items-center justify-center py-8">
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border" style={{ backgroundColor: "hsl(var(--landing-bg-elevated))", borderColor: "hsl(var(--landing-border-strong))" }}>
        <span className="font-mono text-xs font-bold text-l-text">wI</span>
      </div>
      {connections.map((conn, i) => {
        const positions = ["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"];
        return (
          <div key={conn.label} className={`absolute ${positions[i]} landing-card px-4 py-3`}>
            <div className="font-mono text-xs font-semibold text-l-text">{conn.label}</div>
            <div className="font-mono text-[10px] text-l-text-muted">{conn.detail}</div>
          </div>
        );
      })}
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        {[["15%","15%"],["85%","15%"],["15%","85%"],["85%","85%"]].map(([x,y],i) => (
          <line key={i} x1="50%" y1="50%" x2={x} y2={y} stroke="hsl(var(--landing-border-strong))" strokeWidth="1" strokeDasharray="4 4" />
        ))}
      </svg>
    </div>
  );
}

export function VisualAnalise() {
  const weeklyPnL = [320, -150, 480, 210, -80, 560, 340];
  const max = Math.max(...weeklyPnL.map(Math.abs));

  return (
    <div className="landing-card p-5">
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ label: "Win Rate", value: "68%" }, { label: "Profit Factor", value: "2.1" }, { label: "Avg R", value: "1.4" }].map((s) => (
          <div key={s.label} className="rounded-xl px-3 py-2" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
            <div className="font-mono text-[10px] text-l-text-muted uppercase tracking-wider">{s.label}</div>
            <div className="font-mono text-sm font-bold text-l-text">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[10px] text-l-text-muted uppercase tracking-wider mb-3">P&L Semanal</div>
      <div className="flex items-end gap-2 h-24">
        {weeklyPnL.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full rounded-t-md" style={{ height: `${(Math.abs(v) / max) * 100}%`, backgroundColor: v >= 0 ? "hsl(var(--landing-accent) / 0.6)" : "hsl(var(--landing-accent-danger) / 0.5)" }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <span key={d} className="flex-1 text-center font-mono text-[9px] text-l-text-muted">{d}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="font-mono text-[10px] text-l-text-muted">Esta semana</span>
        <span className="font-mono text-xs font-bold text-l-text">+R$1.680</span>
        <span className="font-mono text-[10px] text-l-text-muted">vs. anterior +12%</span>
      </div>
    </div>
  );
}

export function VisualEvolua() {
  return (
    <div className="landing-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent) / 0.6)" }} />
          <span className="font-mono text-xs font-semibold text-l-text">Long EURUSD</span>
        </div>
        <span className="font-mono text-xs font-semibold text-l-text">+1.8R</span>
      </div>
      <div className="space-y-3 mb-4">
        {[{ label: "Sessão", value: "London Open" }, { label: "Setup", value: "Order Block" }, { label: "Emoção", value: "Confiante" }, { label: "Execução", value: "9/10" }].map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <span className="text-l-text-muted">{row.label}</span>
            <span className="font-medium text-l-text">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="aspect-[2/1] rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
        <span className="font-mono text-[10px] text-l-text-muted">Screenshot do gráfico</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Order Block", "EUR/USD", "London", "Confiante", "Tendência"].map((tag) => (
          <span key={tag} className="inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] font-medium" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", color: "hsl(var(--landing-text-secondary))" }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VisualProteja() {
  const alerts = [
    { icon: "⚠️", text: "Drawdown diário: 4.2% / Limite: 5%", type: "warning" as const },
    { icon: "✅", text: "Meta diária atingida: +R$1.240", type: "success" as const },
    { icon: "🔔", text: "Você já fez 6 trades hoje — limite é 8", type: "info" as const },
  ];

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.text} className="landing-card px-5 py-4 flex items-start gap-3">
          <span className="text-lg shrink-0">{alert.icon}</span>
          <span className="text-sm text-l-text">{alert.text}</span>
        </div>
      ))}
    </div>
  );
}
