"use client";

import { Sparkles } from "lucide-react";

export function MockupJournal() {
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
        <span className="font-mono text-xs text-l-text-muted">JOURNAL</span>
      </div>

      {/* Trade entry */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{
          backgroundColor: "hsl(var(--landing-bg-tertiary))",
          borderColor: "hsl(var(--landing-border))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "hsl(152 40% 38%)" }}
            />
            <span className="font-mono text-xs font-semibold text-l-text">
              Long EUR/USD
            </span>
          </div>
          <span
            className="font-mono text-xs font-bold"
            style={{ color: "hsl(152 40% 38%)" }}
          >
            +R$480 (+1.8R)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "Setup", value: "Order Block" },
            { label: "Sessão", value: "London" },
            { label: "Emoção", value: "Confiante" },
            { label: "Execução", value: "9/10" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[11px]">
              <span className="text-l-text-muted">{row.label}</span>
              <span className="font-medium text-l-text">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {["Order Block", "EUR/USD", "London", "Confiante"].map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full px-2 py-0.5 font-mono text-[9px] font-medium"
              style={{
                backgroundColor: "hsl(var(--landing-accent) / 0.08)",
                color: "hsl(var(--landing-text-secondary))",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div
          className="mt-3 pt-3 border-t text-xs text-l-text-secondary leading-relaxed"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          &quot;Entrada no OB de H1 após varredura de liquidez. Execução limpa,
          SL abaixo do OB. Respeitei o plano.&quot;
        </div>
      </div>

      {/* AI Coach response */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: "hsl(var(--landing-accent) / 0.04)",
          borderColor: "hsl(var(--landing-accent) / 0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles
            className="h-3.5 w-3.5"
            style={{ color: "hsl(var(--landing-accent))" }}
          />
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--landing-accent))" }}
          >
            AI Coach
          </span>
        </div>
        <p className="text-xs text-l-text-secondary leading-relaxed">
          Excelente execução. Seu win rate em Order Block na sessão de London é
          de 78% nos últimos 30 dias — 15pp acima da sua média geral. Continue
          priorizando esse setup nesse horário.
        </p>
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
        AI Coach
      </div>
    </div>
  );
}
