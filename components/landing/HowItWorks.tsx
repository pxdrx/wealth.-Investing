"use client";

import { ArrowUp, Activity } from "lucide-react";
import { motion, type TargetAndTransition } from "framer-motion";
import { AnimatedSection } from "./AnimatedSection";
import { StatCounter } from "./StatCounter";
import { STATS_SECTION } from "@/lib/landing-data";

const floatAnim: TargetAndTransition = {
  y: ["-15px", "15px"],
  rotateZ: [-3, 3],
  rotateX: [5, -5],
  rotateY: [-5, 5],
  transition: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
};

export function HowItWorks() {
  return (
    <section className="landing-section" aria-label="Como funciona" id="plataforma">
      <div className="landing-container relative">
        
        {/* Premium Floating Widget - Win Rate */}
        <motion.div
          animate={floatAnim}
          className="absolute -left-4 md:left-[2%] top-[10%] hidden lg:flex flex-col w-[180px] rounded-[22px] bg-gradient-to-b from-white/20 to-white/5 dark:from-white/10 dark:to-transparent border border-white/30 dark:border-white/10 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] overflow-hidden -z-10 pointer-events-none opacity-70 scale-90"
          style={{ transformStyle: "preserve-3d", perspective: 1000 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent opacity-60 pointer-events-none" />
          <div className="p-4 relative text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <p className="text-[10px] font-semibold text-l-text-muted uppercase tracking-wide">Win Rate</p>
            </div>
            <p className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400">68.5%</p>
          </div>
        </motion.div>
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
