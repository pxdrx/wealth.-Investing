"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "./AnimatedSection";

interface Tier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "10 trades por mês",
      "1 conta",
      "Journal básico",
      "Import MT5",
      "Calendário econômico",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 47.9,
    annualPrice: 37.9,
    highlighted: true,
    badge: "Mais popular",
    features: [
      "Trades ilimitados",
      "5 contas",
      "10 consultas AI Coach/mês",
      "Journal completo + Relatórios",
      "Psicologia e tags",
      "Inteligência Macro completa",
      "Headlines ao vivo",
      "Briefing Macroeconômico",
      "Dashboard completo",
      "Export CSV",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    monthlyPrice: 89.9,
    annualPrice: 69.9,
    features: [
      "Tudo do Pro",
      "Contas ilimitadas",
      "10 consultas AI Coach/dia",
      "Comparação de contas",
      "Alertas customizados",
      "Relatórios avançados (MFE/MAE, Sharpe)",
      "Export PDF",
      "Regenerar Briefing on-demand",
      "Histórico macro semanal",
      "Suporte prioritário",
    ],
  },
];

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });
}

export function LandingPricing() {
  const [annual, setAnnual] = useState(false);

  function handleToggle() {
    const goingAnnual = !annual;
    setAnnual(goingAnnual);
    if (goingAnnual) fireConfetti();
  }

  return (
    <section className="landing-section" id="precos">
      <div className="landing-container">
        <AnimatedSection className="text-center mb-12">
          <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
            PREÇOS
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">
            Planos para cada fase da sua jornada
          </h2>
          <p className="text-base leading-relaxed text-l-text-secondary max-w-2xl mx-auto">
            Comece grátis e evolua conforme seu operacional cresce. Sem surpresas, cancele quando quiser.
          </p>
        </AnimatedSection>

        {/* Toggle */}
        <AnimatedSection delay={0.1}>
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className={cn("text-sm font-medium", !annual ? "text-l-text" : "text-l-text-muted")}>
              Mensal
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={handleToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                annual ? "bg-blue-600" : "bg-l-elevated"
              )}
              style={!annual ? { backgroundColor: "hsl(var(--landing-bg-elevated))" } : undefined}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm ring-0 transition-transform",
                  annual ? "translate-x-[22px]" : "translate-x-[2px]"
                )}
                style={{ marginTop: "1px" }}
              />
            </button>
            <span className={cn("text-sm font-medium", annual ? "text-l-text" : "text-l-text-muted")}>
              Anual
            </span>
            {annual && (
              <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                -20%
              </span>
            )}
          </div>
        </AnimatedSection>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {TIERS.map((tier, i) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            const isFree = tier.id === "free";

            return (
              <AnimatedSection key={tier.id} delay={0.1 + i * 0.08}>
                <div
                  className={cn(
                    "relative flex flex-col rounded-[22px] p-6 h-full border transition-shadow",
                    tier.highlighted
                      ? "border-blue-500 border-2 shadow-landing-card-hover"
                      : "border-transparent shadow-landing-card hover:shadow-landing-card-hover"
                  )}
                  style={{ backgroundColor: "hsl(var(--landing-bg-elevated))" }}
                >
                  {tier.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white whitespace-nowrap">
                      {tier.badge}
                    </span>
                  )}

                  <h3 className="text-lg font-semibold tracking-tight text-l-text">{tier.name}</h3>

                  <div className="mt-4 flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-3xl font-bold tracking-tight text-l-text">Grátis</span>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-l-text-muted">R$</span>
                        <NumberFlow
                          value={price}
                          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                          locales="pt-BR"
                          className="text-3xl font-bold tracking-tight text-l-text"
                        />
                        <span className="text-sm text-l-text-muted">/mês</span>
                      </>
                    )}
                  </div>

                  {!isFree && annual && (
                    <p className="mt-1 text-xs text-l-text-muted">
                      Cobrado anualmente
                    </p>
                  )}

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-l-text-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <a
                      href="/login"
                      className={cn(
                        "flex w-full items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-colors",
                        tier.highlighted
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-l-text hover:opacity-80"
                      )}
                      style={!tier.highlighted ? { backgroundColor: "hsl(var(--landing-bg-tertiary))" } : undefined}
                    >
                      {isFree ? "Comece grátis" : "Começar agora"}
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
