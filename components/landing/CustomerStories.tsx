"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
const CUSTOMER_STORIES = [
  { logo: "FTMO Trader", quote: "Como um trader de mesa reduziu seu drawdown em 60% e passou na avaliação da FTMO em 3 semanas usando a wealth.Investing", cta: "Leia o caso completo", href: "#", placeholder: true },
  { logo: "Day Trader BR", quote: "De R$50k negativos para consistência: como a revisão diária com dados transformou um trader de mini-índice", cta: "Leia o caso completo", href: "#", placeholder: true },
  { logo: "Mesa Proprietária", quote: "Mesa proprietária usa wealth.Investing para acompanhar 12 traders simultaneamente e reduziu o turnover de contas em 40%", cta: "Leia o caso completo", href: "#", placeholder: true },
] as const;

export function CustomerStories() {
  const [active, setActive] = useState(0);
  const story = CUSTOMER_STORIES[active];

  return (
    <section className="landing-section" aria-label="Casos de sucesso">
      <div className="landing-container">
        <AnimatedSection>
          <div
            className="rounded-2xl border p-8 md:p-12 overflow-hidden relative"
            style={{
              backgroundColor: "hsl(var(--landing-bg-elevated))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            {/* Active story */}
            <div className="mb-8">
              <span className="inline-block font-mono text-sm font-bold text-l-accent mb-4">
                {story.logo}
              </span>
              {story.placeholder && (
                <span className="ml-2 text-[10px] font-mono text-l-text-muted/50">
                  [PLACEHOLDER]
                </span>
              )}
              <p className="text-lg md:text-xl leading-relaxed text-l-text max-w-3xl mb-6">
                {story.quote}
              </p>
              <a
                href={story.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-l-accent hover:underline"
              >
                {story.cta} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-4">
              {CUSTOMER_STORIES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex items-center gap-2 group"
                  aria-label={`Caso ${i + 1}`}
                >
                  <span
                    className={`font-mono text-xs font-bold transition-colors ${
                      i === active ? "text-l-accent" : "text-l-text-muted"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i < CUSTOMER_STORIES.length - 1 && (
                    <div
                      className="h-px w-12 md:w-20"
                      style={{
                        backgroundColor:
                          i < active
                            ? "hsl(var(--landing-accent))"
                            : "hsl(var(--landing-border-strong))",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
