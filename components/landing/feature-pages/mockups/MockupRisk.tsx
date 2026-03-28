"use client";

import { Shield, AlertTriangle, CheckCircle2, Bell } from "lucide-react";

export function MockupRisk() {
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
          GESTÃO DE RISCO
        </span>
      </div>

      {/* Account card */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{
          backgroundColor: "hsl(var(--landing-bg-tertiary))",
          borderColor: "hsl(var(--landing-border))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-mono text-xs font-semibold text-l-text">
              FTMO 100k
            </div>
            <div className="font-mono text-[10px] text-l-text-muted">
              Fase 2 — Verificação
            </div>
          </div>
          <div
            className="px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold"
            style={{
              backgroundColor: "hsl(152 40% 38% / 0.1)",
              color: "hsl(152 40% 38%)",
            }}
          >
            ATIVA
          </div>
        </div>

        {/* Drawdown bar - Daily */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-l-text-muted">DD Diário</span>
            <span
              className="font-mono font-semibold"
              style={{ color: "hsl(38 80% 48%)" }}
            >
              4.2% / 5%
            </span>
          </div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "hsl(var(--landing-border))" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: "84%",
                backgroundColor: "hsl(38 80% 48%)",
              }}
            />
          </div>
        </div>

        {/* Drawdown bar - Total */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-l-text-muted">DD Total</span>
            <span
              className="font-mono font-semibold"
              style={{ color: "hsl(152 40% 38%)" }}
            >
              6.1% / 10%
            </span>
          </div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "hsl(var(--landing-border))" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: "61%",
                backgroundColor: "hsl(152 40% 38%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Alert items */}
      <div className="space-y-2">
        {[
          {
            Icon: AlertTriangle,
            text: "DD diário se aproximando do limite (84%)",
            color: "hsl(38 80% 48%)",
            bg: "hsl(38 80% 48% / 0.08)",
          },
          {
            Icon: CheckCircle2,
            text: "Meta diária atingida: +R$1.240",
            color: "hsl(152 40% 38%)",
            bg: "hsl(152 40% 38% / 0.08)",
          },
          {
            Icon: Bell,
            text: "6/8 trades máximos hoje",
            color: "hsl(var(--landing-accent))",
            bg: "hsl(var(--landing-accent) / 0.08)",
          },
        ].map((alert) => (
          <div
            key={alert.text}
            className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
            style={{
              backgroundColor: alert.bg,
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <alert.Icon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: alert.color }}
            />
            <span className="text-[11px] text-l-text">{alert.text}</span>
          </div>
        ))}
      </div>

      {/* Floating badge */}
      <div
        className="absolute -top-2 -right-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(38 80% 48% / 0.3)",
          color: "hsl(38 80% 48%)",
        }}
      >
        DD 4.2%
      </div>
    </div>
  );
}
