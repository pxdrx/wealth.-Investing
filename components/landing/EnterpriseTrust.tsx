"use client";

import { Lock, Cloud, Smartphone, ShieldCheck } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { ENTERPRISE } from "@/lib/landing-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  lock: Lock, cloud: Cloud, smartphone: Smartphone, "shield-check": ShieldCheck,
};

export function EnterpriseTrust() {
  return (
    <section className="landing-section" aria-label="Segurança e confiança" id="mesas">
      <div className="landing-container">
        <AnimatedSection className="mb-8">
          <div className="landing-card p-8 md:p-12">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight-apple text-l-text mb-3">{ENTERPRISE.security.title}</h2>
            <p className="text-base text-l-text-secondary mb-6 max-w-2xl">{ENTERPRISE.security.description}</p>
            <div className="flex flex-wrap gap-3">
              {ENTERPRISE.security.badges.map((badge) => {
                const Icon = iconMap[badge.icon] || Lock;
                return (
                  <span key={badge.label} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium text-l-text-secondary" style={{ borderColor: "hsl(var(--landing-border-strong))" }}>
                    <Icon className="h-3.5 w-3.5" />{badge.label}
                  </span>
                );
              })}
            </div>
          </div>
        </AnimatedSection>

        <div className="grid gap-8 md:grid-cols-2">
          {ENTERPRISE.cards.map((card, i) => (
            <AnimatedSection key={card.title} delay={i * 0.1}>
              <div className="landing-card h-full p-8">
                <h3 className="text-lg font-semibold text-l-text mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed text-l-text-secondary mb-6">{card.description}</p>
                {i === 0 ? (
                  <div className="relative h-32">
                    {["Conta MT5 — Pessoal", "Mesa FTMO — Fase 2", "Binance — Spot"].map((label, j) => (
                      <div key={label} className="absolute left-0 right-0 rounded-xl border px-4 py-3 font-mono text-xs text-l-text-secondary" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", borderColor: "hsl(var(--landing-border))", top: `${j * 28}px`, transform: `scale(${1 - j * 0.03})`, zIndex: 3 - j, opacity: 1 - j * 0.15 }}>
                        {label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-l-text-muted">Progresso da avaliação</span>
                      <span className="font-mono font-semibold rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", color: "hsl(var(--landing-text-secondary))" }}>Fase 2 — FTMO</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                      <div className="h-full rounded-full" style={{ width: "72%", backgroundColor: "hsl(var(--landing-text-muted))" }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-l-text-muted">
                      <span>Drawdown: 3.1% / 5%</span><span>Meta: 72% atingida</span>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
