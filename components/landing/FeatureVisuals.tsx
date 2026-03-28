"use client";

import { AlertTriangle, CheckCircle2, Bell } from "lucide-react";

export function VisualRegistre() {
  const connections = [
    { label: "MT5", detail: "342 trades", pos: "top-1 left-1" },
    { label: "FTMO", detail: "Fase 2", pos: "top-1 right-1" },
    { label: "Binance", detail: "Spot", pos: "bottom-1 left-1" },
    { label: "CSV", detail: "1.247 ops", pos: "bottom-1 right-1" },
  ];

  return (
    <div className="relative flex items-center justify-center py-6 min-h-[180px]">
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border" style={{ backgroundColor: "hsl(var(--landing-bg-elevated))", borderColor: "hsl(var(--landing-border-strong))" }}>
        <span className="font-mono text-[10px] font-bold text-l-text">wI</span>
      </div>
      {connections.map((conn) => (
        <div key={conn.label} className={`absolute ${conn.pos} landing-card px-3 py-2`}>
          <div className="font-mono text-[11px] font-semibold text-l-text">{conn.label}</div>
          <div className="font-mono text-[9px] text-l-text-muted">{conn.detail}</div>
        </div>
      ))}
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        {[["18%","18%"],["82%","18%"],["18%","82%"],["82%","82%"]].map(([x,y],i) => (
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
    <div className="landing-card p-4">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[{ label: "Win Rate", value: "68%" }, { label: "PF", value: "2.1" }, { label: "Avg R", value: "1.4" }].map((s) => (
          <div key={s.label} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
            <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider">{s.label}</div>
            <div className="font-mono text-sm font-bold text-l-text">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">P&L Semanal</div>
      <div className="flex items-end gap-1.5 h-16">
        {weeklyPnL.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full rounded-t-sm" style={{ height: `${(Math.abs(v) / max) * 100}%`, backgroundColor: v >= 0 ? "hsl(var(--landing-accent) / 0.6)" : "hsl(var(--landing-accent-danger) / 0.5)" }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <span key={i} className="flex-1 text-center font-mono text-[8px] text-l-text-muted">{d}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-l-text">+R$1.680</span>
        <span className="font-mono text-[10px] text-green-500">+12%</span>
      </div>
    </div>
  );
}

export function VisualEvolua() {
  return (
    <div className="landing-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent) / 0.6)" }} />
          <span className="font-mono text-[11px] font-semibold text-l-text">Long EURUSD</span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-green-500">+1.8R</span>
      </div>
      <div className="space-y-2 mb-3">
        {[{ label: "Sessão", value: "London" }, { label: "Setup", value: "Order Block" }, { label: "Emoção", value: "Confiante" }, { label: "Execução", value: "9/10" }].map((row) => (
          <div key={row.label} className="flex items-center justify-between text-[11px]">
            <span className="text-l-text-muted">{row.label}</span>
            <span className="font-medium text-l-text">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {["Order Block", "EUR/USD", "London", "Confiante"].map((tag) => (
          <span key={tag} className="inline-flex rounded-full px-2 py-0.5 font-mono text-[9px] font-medium" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", color: "hsl(var(--landing-text-secondary))" }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VisualProteja() {
  const alerts = [
    { icon: AlertTriangle, text: "DD diário: 4.2% / Limite: 5%", color: "text-amber-500" },
    { icon: CheckCircle2, text: "Meta atingida: +R$1.240", color: "text-emerald-500" },
    { icon: Bell, text: "6/8 trades hoje", color: "text-l-text-secondary" },
  ];

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div key={alert.text} className="landing-card px-4 py-3 flex items-center gap-2.5">
            <Icon className={`h-4 w-4 shrink-0 ${alert.color}`} />
            <span className="text-[12px] text-l-text">{alert.text}</span>
          </div>
        );
      })}
    </div>
  );
}
