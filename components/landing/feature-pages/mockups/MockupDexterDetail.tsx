"use client";

import { Brain, Clock, Sparkles, TrendingUp } from "lucide-react";

export function MockupDexterDetail() {
  return (
    <div className="p-5 md:p-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Report history */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Historico de Analises
          </div>
          <div className="space-y-2.5">
            {[
              {
                asset: "XAU/USD",
                type: "Analise Completa",
                time: "Hoje, 14:32",
                sentiment: "Bullish",
                sentimentColor: "hsl(152 40% 38%)",
              },
              {
                asset: "EUR/USD",
                type: "Contexto Macro",
                time: "Hoje, 11:15",
                sentiment: "Neutro",
                sentimentColor: "hsl(38 80% 48%)",
              },
              {
                asset: "NAS100",
                type: "Analise Tecnica",
                time: "Ontem, 16:48",
                sentiment: "Bearish",
                sentimentColor: "hsl(4 50% 52%)",
              },
              {
                asset: "DXY",
                type: "Correlacao",
                time: "Ontem, 09:20",
                sentiment: "Bearish",
                sentimentColor: "hsl(4 50% 52%)",
              },
            ].map((report, i) => (
              <div
                key={i}
                className="rounded-xl border p-3.5"
                style={{
                  backgroundColor: "hsl(var(--landing-bg-tertiary))",
                  borderColor: "hsl(var(--landing-border))",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Brain
                      className="h-3.5 w-3.5"
                      style={{ color: "hsl(var(--landing-accent))" }}
                    />
                    <span className="font-mono text-xs font-semibold text-l-text">
                      {report.asset}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded font-mono text-[9px]"
                      style={{
                        backgroundColor: "hsl(var(--landing-accent) / 0.08)",
                        color: "hsl(var(--landing-text-secondary))",
                      }}
                    >
                      {report.type}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: report.sentimentColor.replace(")", " / 0.12)"),
                      color: report.sentimentColor,
                    }}
                  >
                    {report.sentiment}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-l-text-muted">
                  <Clock className="h-3 w-3" />
                  {report.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Memory & insights */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles
              className="h-3 w-3"
              style={{ color: "hsl(var(--landing-accent))" }}
            />
            MEMORIA DO DEXTER
          </div>

          {/* Memory cards */}
          <div
            className="rounded-xl border p-4 mb-4"
            style={{
              backgroundColor: "hsl(var(--landing-accent) / 0.03)",
              borderColor: "hsl(var(--landing-accent) / 0.12)",
            }}
          >
            <div className="space-y-3 text-xs text-l-text-secondary leading-relaxed">
              <p>
                <span className="font-semibold text-l-text">Perfil detectado:</span>{" "}
                Swing trader, foco em Forex + Commodities. Prefere sessao de London.
              </p>
              <p>
                <span className="font-semibold text-l-text">Ativos favoritos:</span>{" "}
                XAU/USD (42% dos trades), EUR/USD (28%), GBP/JPY (15%).
              </p>
              <p>
                <span className="font-semibold text-l-text">Insight acumulado:</span>{" "}
                Correlacao DXY-Ouro tem sido forte nas ultimas 3 semanas. Cada queda
                de 0.3% no DXY = ~$12 de alta no XAU.
              </p>
            </div>
          </div>

          {/* Connected insights */}
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Conexoes Detectadas
          </div>
          <div className="space-y-2">
            {[
              {
                icon: TrendingUp,
                text: "DXY caindo → XAU subindo (correlacao -0.87)",
              },
              {
                icon: TrendingUp,
                text: "Seu WR em XAU sobe 15% quando DXY < 104",
              },
              {
                icon: TrendingUp,
                text: "Best setup: FVG Fill em XAU na sessao de London",
              },
            ].map((insight, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                style={{
                  backgroundColor: "hsl(var(--landing-bg-tertiary))",
                  borderColor: "hsl(var(--landing-border))",
                }}
              >
                <insight.icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "hsl(var(--landing-accent))" }}
                />
                <span className="text-[11px] text-l-text">{insight.text}</span>
              </div>
            ))}
          </div>

          {/* Session count */}
          <div
            className="rounded-xl border p-3 mt-4 text-center"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div
              className="font-mono text-lg font-bold"
              style={{ color: "hsl(var(--landing-accent))" }}
            >
              127
            </div>
            <div className="font-mono text-[9px] text-l-text-muted uppercase">
              analises acumuladas na memoria
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
