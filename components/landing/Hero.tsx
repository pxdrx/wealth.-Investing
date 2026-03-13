"use client";

import { motion } from "framer-motion";
import { JournalMockup } from "./JournalMockup";
import { GridPattern } from "./GridPattern";
import { HERO } from "@/lib/landing-data";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function Hero() {
  return (
    <section className="relative overflow-hidden landing-section" aria-label="Hero">
      <GridPattern className="opacity-40" />
      <div className="landing-container relative z-10">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16 items-center">
          <div className="max-w-xl">
            <motion.h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tighter-apple text-l-text mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
              {HERO.headline}
            </motion.h1>
            <motion.p className="text-base md:text-lg leading-relaxed text-l-text-secondary mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }}>
              {HERO.subheadline}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease }}>
              <a href="/login" className="inline-flex items-center justify-center rounded-lg px-7 py-3.5 text-sm font-medium transition-all hover:brightness-110" style={{ backgroundColor: "hsl(var(--landing-accent))", color: "#fff" }}>
                {HERO.ctaPrimary}
              </a>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.15, ease }} className="relative">
            <JournalMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
