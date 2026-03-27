"use client";

import { Brain, Send } from "lucide-react";

export function MockupDexter() {
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
        <span className="font-mono text-xs text-l-text-muted">
          ANALISTA DEXTER
        </span>
      </div>

      {/* Chat messages */}
      <div className="space-y-3 mb-5">
        {/* User message */}
        <div className="flex justify-end">
          <div
            className="rounded-xl rounded-tr-sm px-4 py-2.5 max-w-[75%]"
            style={{
              backgroundColor: "hsl(var(--landing-accent) / 0.12)",
              color: "hsl(var(--landing-text))",
            }}
          >
            <p className="text-xs">Analisa XAUUSD para mim</p>
          </div>
        </div>

        {/* Dexter report card */}
        <div className="flex justify-start">
          <div
            className="rounded-xl rounded-tl-sm max-w-[90%] overflow-hidden border"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            {/* Report header */}
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ backgroundColor: "hsl(var(--landing-accent) / 0.06)" }}
            >
              <Brain
                className="h-3.5 w-3.5"
                style={{ color: "hsl(var(--landing-accent))" }}
              />
              <span className="font-mono text-[10px] font-semibold text-l-text">
                Relatório XAU/USD
              </span>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              {/* Price targets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Preço Atual", value: "$2,342" },
                  { label: "Suporte", value: "$2,318" },
                  { label: "Resistência", value: "$2,365" },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="text-center rounded-lg py-1.5"
                    style={{ backgroundColor: "hsl(var(--landing-bg-elevated))" }}
                  >
                    <div className="font-mono text-[8px] text-l-text-muted uppercase">
                      {t.label}
                    </div>
                    <div
                      className="font-mono text-xs font-bold"
                      style={{ color: "hsl(var(--landing-accent))" }}
                    >
                      {t.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Analysis snippet */}
              <p className="text-[11px] text-l-text-secondary leading-relaxed">
                <span className="font-semibold text-l-text">Contexto Macro:</span>{" "}
                DXY enfraquecendo (-0.4%), yields em queda. Ouro se beneficia do
                flight-to-quality com tensoes geopoliticas.
              </p>
              <p className="text-[11px] text-l-text-secondary leading-relaxed">
                <span className="font-semibold text-l-text">Tecnico:</span> Acima
                da EMA 50 no H4. FVG preenchido em $2,330. Bias altista acima de
                $2,318.
              </p>

              {/* Sentiment pill */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex rounded-full px-2.5 py-1 font-mono text-[9px] font-semibold"
                  style={{
                    backgroundColor: "hsl(152 40% 38% / 0.12)",
                    color: "hsl(152 40% 38%)",
                  }}
                >
                  BULLISH
                </span>
                <span className="text-[10px] text-l-text-muted">
                  Confianca: 78%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
        style={{
          backgroundColor: "hsl(var(--landing-bg-tertiary))",
          borderColor: "hsl(var(--landing-border))",
        }}
      >
        <span className="text-xs text-l-text-muted flex-1">
          Pergunte ao Dexter...
        </span>
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "hsl(var(--landing-accent) / 0.12)" }}
        >
          <Send
            className="h-3.5 w-3.5"
            style={{ color: "hsl(var(--landing-accent))" }}
          />
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
        AI Research
      </div>
    </div>
  );
}
