"use client";

import { ScanLine, Cpu, FileText } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { DEXTER_SECTION } from "@/lib/landing-data";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  scan: ScanLine,
  cpu: Cpu,
  "file-text": FileText,
};

function ConfidenceBadge({ label, level }: { label: string; level: "high" | "medium" | "low" }) {
  const colors = {
    high: { bg: "hsl(152 40% 38% / 0.12)", text: "hsl(152 40% 38%)" },
    medium: { bg: "hsl(45 80% 50% / 0.12)", text: "hsl(45 80% 42%)" },
    low: { bg: "hsl(0 60% 50% / 0.12)", text: "hsl(0 60% 45%)" },
  };
  const c = colors[level];
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}

function MiniCard({ title, badge }: { title: string; badge: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2 border"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
      }}
    >
      <span className="text-[10px] font-semibold text-l-text">{title}</span>
      <ConfidenceBadge label={badge} level="medium" />
    </div>
  );
}

export function DexterSection() {
  return (
    <section className="landing-section" aria-label="Analista Dexter">
      <div className="landing-container">
        <div className="grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16 items-center">
          {/* Visual -- Dexter report preview */}
          <AnimatedSection>
            <div className="landing-card p-0 overflow-hidden">
              {/* Header bar */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "hsl(var(--landing-border))" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-l-text">Analista Dexter</span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold"
                    style={{ backgroundColor: "hsl(152 40% 38% / 0.12)", color: "hsl(152 40% 38%)" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(152 40% 38%)" }} />
                    IA
                  </span>
                </div>
              </div>

              {/* Search bar */}
              <div className="px-5 py-3 border-b" style={{ borderColor: "hsl(var(--landing-border))" }}>
                <div
                  className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                  style={{
                    backgroundColor: "hsl(var(--landing-bg-tertiary))",
                    borderColor: "hsl(var(--landing-border))",
                  }}
                >
                  <span className="text-xs text-l-text-muted flex-1">
                    Bitcoin, Ouro, EURUSD, Apple, S&P 500...
                  </span>
                  <span
                    className="rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold"
                    style={{
                      backgroundColor: "hsl(var(--landing-accent))",
                      color: "white",
                    }}
                  >
                    Analisar
                  </span>
                </div>
              </div>

              {/* Report card */}
              <div className="p-5 space-y-4">
                {/* Report header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-l-text">XAUUSD</p>
                    <p className="text-[10px] text-l-text-muted mt-0.5">26 Mar 2026</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge label="Neutro" level="medium" />
                    <span className="font-mono text-[9px] text-l-text-muted">CONFIANCA MEDIA</span>
                  </div>
                </div>

                {/* Analysis snippet */}
                <div
                  className="rounded-xl border px-4 py-3 space-y-2"
                  style={{
                    backgroundColor: "hsl(var(--landing-bg-tertiary))",
                    borderColor: "hsl(var(--landing-border))",
                  }}
                >
                  <p className="text-[11px] text-l-text-secondary leading-relaxed">
                    Ouro opera em consolidacao apos rally de 3.2% na semana. DXY estavel em 103.4. Yields de 10Y
                    recuando para 4.18%. Suporte principal em <strong className="text-l-text">$2,318</strong>,
                    resistencia em <strong className="text-l-text">$2,365</strong>. Cenario neutro com vies de alta
                    acima de $2,340.
                  </p>
                </div>

                {/* Trade idea */}
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor: "hsl(var(--landing-bg-elevated))",
                    borderColor: "hsl(var(--landing-border))",
                  }}
                >
                  <p className="font-mono text-[8px] uppercase tracking-wider text-l-text-muted mb-2">
                    IDEIA DE TRADE
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-l-text">Setup A</span>
                    <span className="text-[10px] text-l-text-secondary">
                      Long acima de $2,340 &rarr; TP $2,365 &rarr; SL $2,318
                    </span>
                    <span
                      className="ml-auto font-mono text-[9px] font-semibold"
                      style={{ color: "hsl(152 40% 38%)" }}
                    >
                      RR 1:1.14
                    </span>
                  </div>
                </div>

                {/* Bottom cards */}
                <div className="grid grid-cols-2 gap-2">
                  <MiniCard title="Contexto Macro" badge="Neutro" />
                  <MiniCard title="Análise Técnica" badge="Alta" />
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
                const Icon = iconMap[feat.icon] || ScanLine;
                return (
                  <div key={feat.title} className="flex gap-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "hsl(var(--landing-accent) / 0.1)" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "hsl(var(--landing-accent))" }} />
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
        </div>
      </div>
    </section>
  );
}
