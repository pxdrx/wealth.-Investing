"use client";

import { JournalMockup } from "./JournalMockup";
import { GridPattern } from "./GridPattern";
import { HERO } from "@/lib/landing-data";

export function Hero() {
  return (
    <section className="relative overflow-hidden landing-section" aria-label="Hero">
      <GridPattern className="opacity-40" />
      <div className="landing-container relative z-10">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16 items-center">
          <div className="max-w-xl">
            <h1
              className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tighter-apple text-l-text mb-6 hero-fade-in"
              style={{ animationDelay: "0s" }}
            >
              {HERO.headline}
            </h1>
            <p
              className="text-base md:text-lg leading-relaxed text-l-text-secondary mb-8 hero-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              {HERO.subheadline}
            </p>
            <div className="hero-fade-in" style={{ animationDelay: "0.2s" }}>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-lg px-7 py-3.5 text-sm font-medium transition-all hover:brightness-110"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                {HERO.ctaPrimary}
              </a>
            </div>
          </div>
          <div
            className="relative hero-fade-in"
            style={{ animationDelay: "0.15s" }}
          >
            <JournalMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
