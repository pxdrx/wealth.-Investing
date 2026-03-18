"use client";

import { ArrowUp } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { StatCounter } from "./StatCounter";
import { STATS_SECTION } from "@/lib/landing-data";

export function HowItWorks() {
  return (
    <section className="landing-section" aria-label="Como funciona" id="plataforma">
      <div className="landing-container">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
            {STATS_SECTION.label}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text">
            {STATS_SECTION.headline}
          </h2>
        </AnimatedSection>

        <div className="grid gap-8 md:grid-cols-3">
          {STATS_SECTION.stats.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.1}>
              <div className="landing-card landing-card-hover p-8 h-full">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-4xl md:text-5xl font-bold text-l-text">
                    <StatCounter value={stat.numericValue} suffix={stat.suffix} />
                  </span>
                  <ArrowUp className="h-5 w-5 mt-2 text-l-text-muted" />
                </div>
                <h3 className="text-base font-semibold text-l-text mb-2">{stat.label}</h3>
                <p className="text-sm leading-relaxed text-l-text-secondary">{stat.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
