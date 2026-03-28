"use client";

import { MessageCircle, Brain, Compass, TrendingUp, TrendingDown, Users, Newspaper, BarChart3 } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { AI_SECTION } from "@/lib/landing-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "message-circle": MessageCircle,
  brain: Brain,
  compass: Compass,
};

function SentimentPill({ symbol, longPct, traders }: { symbol: string; longPct: number; traders: number }) {
  const isLong = longPct >= 50;
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-1.5"
      style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
    >
      {isLong ? (
        <TrendingUp className="h-3 w-3 text-green-500" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-400" />
      )}
      <span className="font-mono text-[11px] font-semibold text-l-text">{symbol}</span>
      <span className={`font-mono text-[10px] font-bold ${isLong ? "text-green-500" : "text-red-400"}`}>
        {longPct}% long
      </span>
      <span className="font-mono text-[9px] text-l-text-muted">{traders} traders</span>
    </div>
  );
}

function MacroBadge({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[9px] text-l-text-secondary"
      style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
    >
      <Newspaper className="h-2.5 w-2.5" />
      {text}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 0.15, 0.3].map((delay, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: "hsl(var(--landing-text-muted))", animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

export function AIAssistant() {
  return (
    <section className="landing-section" aria-label="AI Coach">
      <div className="landing-container">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16 items-center">
          {/* Text */}
          <AnimatedSection>
            <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
              [{AI_SECTION.number}] {AI_SECTION.label}
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">
              {AI_SECTION.headline}
            </h2>

            <p className="text-base leading-relaxed text-l-text-secondary mb-8">
              {AI_SECTION.description}
            </p>

            <div className="space-y-4">
              {AI_SECTION.features.map((feat) => {
                const Icon = iconMap[feat.icon] || MessageCircle;
                return (
                  <div key={feat.title} className="flex gap-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                    >
                      <Icon className="h-4 w-4 text-l-text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-l-text">{feat.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-l-text-secondary">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>

          {/* Visual — AI Coach preview */}
          <AnimatedSection delay={0.15}>
            <div className="landing-card p-0 overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "hsl(var(--landing-border))" }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                    <Brain className="h-4 w-4 text-l-text-secondary" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-l-text">AI Coach</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="font-mono text-[9px] text-l-text-muted">Online</span>
                    </div>
                  </div>
                </div>
                {/* Usage badge */}
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                    <div className="h-full w-[30%] rounded-full bg-green-500" />
                  </div>
                  <span className="font-mono text-[9px] text-l-text-muted">3/10</span>
                </div>
              </div>

              {/* Data sources strip */}
              <div className="flex items-center gap-2 px-5 py-2.5 border-b overflow-x-auto" style={{ borderColor: "hsl(var(--landing-border))" }}>
                <span className="font-mono text-[8px] uppercase tracking-wider text-l-text-muted shrink-0">Fontes:</span>
                {[
                  { icon: BarChart3, label: "142 trades" },
                  { icon: Users, label: "38 traders" },
                  { icon: Newspaper, label: "5 headlines" },
                ].map((src) => (
                  <div key={src.label} className="flex items-center gap-1 shrink-0 rounded-md px-1.5 py-0.5" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                    <src.icon className="h-2.5 w-2.5 text-l-text-muted" />
                    <span className="font-mono text-[9px] text-l-text-muted">{src.label}</span>
                  </div>
                ))}
              </div>

              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5"
                    style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                  >
                    <p className="text-xs text-l-text">
                      Estou pensando em shortear EURUSD essa semana. O que acha?
                    </p>
                  </div>
                </div>

                {/* AI Coach response */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 border"
                    style={{
                      backgroundColor: "hsl(var(--landing-bg-elevated))",
                      borderColor: "hsl(var(--landing-border))",
                    }}
                  >
                    {/* Disagreement header */}
                    <p className="text-xs font-semibold text-l-text mb-2">
                      Considere o outro lado antes de decidir.
                    </p>

                    <div className="space-y-2.5 text-xs text-l-text-secondary leading-relaxed">
                      <p>
                        Seus dados mostram que nas <strong className="text-l-text">últimas 6 operações short em EURUSD</strong>, você teve
                        win rate de apenas <strong className="text-red-400">33%</strong> e PF de 0.8.
                      </p>

                      {/* Community sentiment */}
                      <div className="flex flex-wrap gap-1.5 my-2">
                        <SentimentPill symbol="EURUSD" longPct={72} traders={38} />
                        <SentimentPill symbol="XAUUSD" longPct={61} traders={27} />
                      </div>

                      <p>
                        <strong className="text-l-text">72% dos traders lucrativos</strong> da plataforma
                        estão long em EURUSD esta semana.
                      </p>

                      {/* Macro context */}
                      <div className="flex flex-wrap gap-1.5 my-2">
                        <MacroBadge text="ECB mantém taxa em 3.5%" />
                        <MacroBadge text="DXY -1.2% no mês" />
                      </div>

                      <p>
                        O contexto macro sugere pressão vendedora no dólar —
                        <strong className="text-l-text"> DXY acumula -1.2% no mês</strong> e o ECB sinalizou manutenção.
                      </p>
                    </div>

                    {/* Suggestion box */}
                    <div
                      className="mt-3 rounded-xl px-3 py-2.5"
                      style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                    >
                      <p className="text-[11px] text-l-text leading-relaxed">
                        <strong>Orientação:</strong> Seus melhores resultados em EUR vêm de operações
                        na <strong>sessão de Londres</strong> (WR 71%). Se for operar, considere esperar
                        um setup nessa janela ao invés de entrar agora.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Typing indicator for next message */}
                <div className="flex justify-start">
                  <TypingDots />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
