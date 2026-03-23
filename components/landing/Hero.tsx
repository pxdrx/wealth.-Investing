"use client";

import { motion } from "framer-motion";
import { Bitcoin, ArrowUpRight, TrendingUp } from "lucide-react";
import { JournalMockup } from "./JournalMockup";
import { GridPattern } from "./GridPattern";
import { HERO } from "@/lib/landing-data";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

const floatingCoin1: any = {
  y: ["-20px", "20px"],
  rotateX: [15, -15],
  rotateY: [-15, 15],
  transition: {
    duration: 5,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut",
  },
};

const floatingCoin2: any = {
  y: ["20px", "-20px"],
  rotateX: [-10, 10],
  rotateY: [15, -15],
  transition: {
    duration: 6,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut",
  },
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 12 } },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden landing-section" aria-label="Hero">
      <GridPattern className="opacity-25" />
      
      {/* Ambient 3D Glass Widgets (Pushed to background) */}
      <motion.div
        animate={floatingCoin1}
        className="absolute top-[8%] right-[5%] -z-10 hidden xl:flex flex-col w-[280px] rounded-3xl bg-white/5 dark:bg-black/10 border border-white/20 dark:border-white/5 backdrop-blur-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] overflow-hidden pointer-events-none opacity-70 scale-90"
        style={{ transformStyle: "preserve-3d", perspective: 1200 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-80" />
        <div className="p-6 relative text-left">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400/80 to-yellow-600/80 shadow-inner shadow-white/20 backdrop-blur-md">
              <Bitcoin className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-l-text-muted uppercase tracking-widest drop-shadow-sm">Bitcoin</p>
              <p className="text-sm font-semibold text-l-text">BTC/USD</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-[28px] font-display font-medium text-l-text mt-1 tracking-tight">$68,240</p>
            <div className="flex items-center text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg backdrop-blur-md">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              <span className="text-[11px] font-bold tracking-wide">+5.4%</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={floatingCoin2}
        className="absolute bottom-[25%] left-[-2%] -z-10 hidden xl:flex flex-col w-[260px] rounded-3xl bg-white/5 dark:bg-black/10 border border-white/20 dark:border-white/5 backdrop-blur-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] overflow-hidden pointer-events-none opacity-60 scale-90"
        style={{ transformStyle: "preserve-3d", perspective: 1200 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-80" />
        <div className="p-6 relative text-left">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400/80 to-teal-600/80 shadow-inner shadow-white/20 backdrop-blur-md">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-l-text-muted uppercase tracking-widest drop-shadow-sm">Desempenho</p>
              <p className="text-sm font-semibold text-l-text">Realizado</p>
            </div>
          </div>
          <p className="text-3xl font-display font-medium text-emerald-500 dark:text-emerald-400 mt-1 tracking-tight">+$12,450</p>
        </div>
      </motion.div>

      <div className="landing-container relative z-10">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16 items-center">
          <motion.div 
            variants={staggerContainer} 
            initial="hidden" 
            animate="show" 
            className="max-w-xl"
          >
            <motion.h1
              variants={fadeUp}
              className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-headline font-extrabold leading-[1.05] tracking-tight text-l-text mb-6"
            >
              {HERO.headline}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-base md:text-lg leading-relaxed text-l-text-secondary mb-8"
            >
              {HERO.subheadline}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 relative z-50">
              <a href="/login" className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-base font-semibold px-10 py-5 min-w-[200px] rounded-full hover:bg-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(26,26,26,0.12)]">
                {HERO.ctaPrimary}
              </a>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 45, damping: 15, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -10 }}
            className="relative will-change-transform duration-300"
          >
            <JournalMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
