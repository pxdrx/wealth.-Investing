"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";

const STEPS = [
  "Decifrando seu comportamento",
  "Mapeando padrões emocionais",
  "Identificando vieses cognitivos",
  "Analisando disciplina operacional",
  "Detectando sinais de tilt",
  "Traçando perfil psicológico",
];

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Loading diferenciado para a aba Psicologia: CpuArchitecture (luzes piscando)
 * + mensagens rotativas + barra de progresso assintótica (nunca atinge 100%
 * até o servidor responder).
 */
export function PsychologyLoadingAnimation() {
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(5);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length);
    }, 2500);

    // Progresso assintótico — converge para ~95%
    const pctTimer = setInterval(() => {
      setPct((p) => Math.min(p + (95 - p) * 0.08, 95));
    }, 400);

    return () => {
      clearInterval(stepTimer);
      clearInterval(pctTimer);
    };
  }, []);

  return (
    <div
      className="rounded-[22px] border border-border/40 p-8 flex flex-col items-center gap-6 isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="text-indigo-500 dark:text-indigo-400">
        <CpuArchitecture
          width="260"
          height="180"
          text="PSICOLOGIA"
          animateMarkers
          animateLines
          animateText
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: easeApple }}
          className="text-sm font-medium text-foreground"
        >
          {STEPS[stepIdx]}…
        </motion.div>
      </AnimatePresence>

      <div className="w-full max-w-sm h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500"
          initial={{ width: "5%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: easeApple }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground text-center max-w-xs">
        Primeira análise do dia — a próxima visita hoje mostra esta mesma instantaneamente.
      </p>
    </div>
  );
}
