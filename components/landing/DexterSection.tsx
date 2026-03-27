"use client";

import { Brain, Search, FileText, Sparkles, Clock, ChevronRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { DEXTER_SECTION } from "@/lib/landing-data";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  brain: Brain,
  search: Search,
  "file-text": FileText,
};

function ResearchCard({ title, tag, time }: { title: string; tag: string; time: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-3.5 py-3 border"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
      }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "hsla(270, 70%, 60%, 0.12)" }}
      >
        <FileText className="h-3.5 w-3.5" style={{ color: "hsl(270, 70%, 60%)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-l-text truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] font-medium"
            style={{ backgroundColor: "hsla(270, 70%, 60%, 0.1)", color: "hsl(270, 70%, 60%)" }}
          >
            {tag}
          </span>
          <span className="flex items-center gap-0.5 font-mono text-[9px] text-l-text-muted">
            <Clock className="h-2.5 w-2.5" />
            {time}
          </span>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-l-text-muted mt-1 shrink-0" />
    </div>
  );
}

function MemoryBadge({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[9px] text-l-text-secondary"
      style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
    >
      <Brain className="h-2.5 w-2.5" />
      {text}
    </span>
  );
}

export function DexterSection() {
  return (
    <section className="landing-section" aria-label="Analista Dexter">
      <div className="landing-container">
        <div className="grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16 items-center">
          {/* Visual — Dexter chat/research preview */}
          <AnimatedSection>
            <div className="landing-card p-0 overflow-hidden">
              {/* Header bar */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "hsl(var(--landing-border))" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "hsla(270, 70%, 60%, 0.12)" }}
                  >
                    <Sparkles className="h-4 w-4" style={{ color: "hsl(270, 70%, 60%)" }} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-l-text">Dexter</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(270, 70%, 60%)" }} />
                      <span className="font-mono text-[9px] text-l-text-muted">Analisando mercado</span>
                    </div>
                  </div>
                </div>
                {/* Memory indicator */}
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3 w-3 text-l-text-muted" />
                  <span className="font-mono text-[9px] text-l-text-muted">47 memórias</span>
                </div>
              </div>

              {/* Memory context strip */}
              <div
                className="flex items-center gap-2 px-5 py-2.5 border-b overflow-x-auto"
                style={{ borderColor: "hsl(var(--landing-border))" }}
              >
                <span className="font-mono text-[8px] uppercase tracking-wider text-l-text-muted shrink-0">
                  Contexto:
                </span>
                <MemoryBadge text="EURUSD: viés comprador" />
                <MemoryBadge text="Prefere sessão Londres" />
                <MemoryBadge text="Foco em ICT" />
              </div>

              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5"
                    style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                  >
                    <p className="text-xs text-l-text">
                      Prepara um relatório do XAUUSD para amanhã. Quero saber se faz sentido comprar.
                    </p>
                  </div>
                </div>

                {/* Dexter response */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 border"
                    style={{
                      backgroundColor: "hsl(var(--landing-bg-elevated))",
                      borderColor: "hsl(var(--landing-border))",
                    }}
                  >
                    <p className="text-xs font-semibold text-l-text mb-2">
                      Relatório XAUUSD — Análise Completa
                    </p>

                    <div className="space-y-2.5 text-xs text-l-text-secondary leading-relaxed">
                      <p>
                        Com base nas suas <strong className="text-l-text">últimas 12 operações em XAUUSD</strong>, seu
                        win rate é de <strong style={{ color: "hsl(270, 70%, 60%)" }}>67%</strong> em long —
                        consistente com seu viés comprador que eu já tenho registrado.
                      </p>

                      <p>
                        <strong className="text-l-text">Contexto macro:</strong> DXY em queda (-0.8% na semana),
                        yields de 10Y recuando, e NFP amanhã pode gerar volatilidade. Cenário
                        favorável para ouro como hedge.
                      </p>
                    </div>

                    {/* Research reports generated */}
                    <div className="mt-3 space-y-2">
                      <span className="font-mono text-[8px] uppercase tracking-wider text-l-text-muted">
                        Relatórios gerados:
                      </span>
                      <ResearchCard title="XAUUSD — Técnico + Macro" tag="Completo" time="2 min" />
                      <ResearchCard title="Correlação DXY vs Gold" tag="Research" time="1 min" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Text */}
          <AnimatedSection delay={0.15}>
            <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
              [{DEXTER_SECTION.number}] {DEXTER_SECTION.label}
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">
              {DEXTER_SECTION.headline}
            </h2>

            <p className="text-base leading-relaxed text-l-text-secondary mb-8">
              {DEXTER_SECTION.description}
            </p>

            <div className="space-y-4">
              {DEXTER_SECTION.features.map((feat) => {
                const Icon = iconMap[feat.icon] || Brain;
                return (
                  <div key={feat.title} className="flex gap-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "hsla(270, 70%, 60%, 0.12)" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "hsl(270, 70%, 60%)" }} />
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
        </div>
      </div>
    </section>
  );
}
