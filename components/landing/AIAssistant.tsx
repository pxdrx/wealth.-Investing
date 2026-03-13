"use client";

import { MessageCircle, Brain, Compass } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { AI_SECTION } from "@/lib/landing-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "message-circle": MessageCircle,
  brain: Brain,
  compass: Compass,
};

export function AIAssistant() {
  return (
    <section className="landing-section" aria-label="Inteligência Artificial">
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
                      <h3 className="text-sm font-semibold text-l-text">{feat.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-l-text-secondary">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>

          {/* Visual — chat-like interface */}
          <AnimatedSection delay={0.15}>
            <div className="landing-card p-5">
              {/* Chat header */}
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b" style={{ borderColor: "hsl(var(--landing-border))" }}>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                  <Brain className="h-3.5 w-3.5 text-l-text-secondary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-l-text">Assistente wealth.Investing</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent))" }} />
                    <span className="font-mono text-[9px] text-l-text-muted">Online</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5"
                    style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                  >
                    <p className="text-xs text-l-text">
                      Analisa meus trades desta semana. Onde estou perdendo dinheiro?
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 border"
                    style={{
                      backgroundColor: "hsl(var(--landing-bg-elevated))",
                      borderColor: "hsl(var(--landing-border))",
                    }}
                  >
                    <p className="text-xs text-l-text-secondary leading-relaxed mb-2">
                      Analisei seus 14 trades desta semana. Pontos principais:
                    </p>
                    <div className="space-y-1.5 text-xs text-l-text-secondary">
                      <div className="flex items-start gap-2">
                        <span className="text-l-text-muted shrink-0">1.</span>
                        <span><strong className="text-l-text">3 losses</strong> vieram de entradas no <strong className="text-l-text">NY afternoon</strong> — seu win rate nesse horário é 28%</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-l-text-muted shrink-0">2.</span>
                        <span>Seu setup <strong className="text-l-text">Order Block</strong> segue consistente: 5W/1L, profit factor 3.2</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-l-text-muted shrink-0">3.</span>
                        <span>Trades marcados como <strong className="text-l-text">&quot;impulsivo&quot;</strong> geraram -R$480 no total</span>
                      </div>
                    </div>
                    <div
                      className="mt-3 rounded-lg px-3 py-2 text-xs"
                      style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                    >
                      <span className="text-l-text-muted">Sugestão:</span>{" "}
                      <span className="text-l-text">Considere não operar após 16h. Seus dados mostram que 73% do resultado negativo vem desse horário.</span>
                    </div>
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(var(--landing-text-muted))" }} />
                    <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(var(--landing-text-muted))", animationDelay: "0.15s" }} />
                    <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(var(--landing-text-muted))", animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
