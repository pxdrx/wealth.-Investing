"use client";

import { Globe, Calendar, Newspaper } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { MACRO_SECTION } from "@/lib/landing-data";

export function MacroIntelligence() {
  const impactColor = (impact: string) => {
    if (impact === "high") return "hsl(var(--landing-accent-danger))";
    if (impact === "medium") return "hsl(var(--landing-accent-warning))";
    return "hsl(var(--landing-text-muted))";
  };

  return (
    <section className="landing-section" aria-label="Inteligência Macro">
      <div className="landing-container">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
            {MACRO_SECTION.label}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">
            {MACRO_SECTION.headline}
          </h2>
          <p className="text-base leading-relaxed text-l-text-secondary">
            {MACRO_SECTION.description}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 lg:grid-cols-[7fr_5fr]">
          {/* Economic calendar */}
          <AnimatedSection>
            <div className="landing-card p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-l-text-muted" />
                <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-l-text-muted">
                  Calendário Econômico — Hoje
                </span>
              </div>

              <div className="space-y-0">
                {MACRO_SECTION.calendarEvents.map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3 border-b last:border-b-0"
                    style={{ borderColor: "hsl(var(--landing-border))" }}
                  >
                    <span className="font-mono text-xs text-l-text-muted w-12 shrink-0">
                      {evt.time}
                    </span>
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: impactColor(evt.impact) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-l-text truncate">
                        {evt.event}
                      </div>
                      <div className="font-mono text-[9px] text-l-text-muted">
                        {evt.country}
                      </div>
                    </div>
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        color: impactColor(evt.impact),
                        backgroundColor: `${impactColor(evt.impact)}15`,
                      }}
                    >
                      {evt.impact === "high" ? "alto" : evt.impact === "medium" ? "médio" : "baixo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Headlines + modules */}
          <div className="flex flex-col gap-6">
            <AnimatedSection delay={0.1}>
              <div className="landing-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="h-4 w-4 text-l-text-muted" />
                  <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-l-text-muted">
                    Headlines
                  </span>
                </div>
                <div className="space-y-3">
                  {MACRO_SECTION.headlines.map((hl, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs leading-relaxed text-l-text-secondary"
                    >
                      <span className="text-l-text-muted mt-0.5 shrink-0">—</span>
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="landing-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-l-text-muted" />
                  <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-l-text-muted">
                    Módulos
                  </span>
                </div>
                <div className="space-y-2.5">
                  {MACRO_SECTION.modules.map((mod) => (
                    <div key={mod.title}>
                      <div className="text-xs font-semibold text-l-text">{mod.title}</div>
                      <div className="text-[11px] leading-relaxed text-l-text-muted">{mod.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
